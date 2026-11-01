-- Phase 4: competence reviews, appointment letters and "report a change".
--
-- Security model (all policies require aal2):
--   * Reviewers are the project owner plus anyone holding an active
--     "check competence" item (CL-11E-REVIEW-*), which follows the client's
--     duties to whoever holds them on a domestic project. Reviewers can read
--     submitted statements and evidence on their project; nobody can review
--     their own.
--   * reviews, appointment_signatures and competence_change_reports are
--     append-only.
--   * Appointments, their signatories and signatures are visible to every
--     project member. Only the owner prepares or voids an appointment; only
--     the named signatories can sign, each for their own party.

-------------------------------------------------------------------------------
-- Reviewers
-------------------------------------------------------------------------------

create function public.is_project_reviewer(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(p_project_id) or (public.is_aal2() and exists (
    select 1
    from public.checklist_items i
    join public.project_members m on m.id = i.member_id
    where i.project_id = p_project_id
      and i.template_code like 'CL-11E-REVIEW-%'
      and i.withdrawn_at is null
      and m.user_id = auth.uid() and m.removed_at is null
  ));
$$;

-- Widened from phase 3: reviewers (not just the owner) can read a submitted
-- statement linked to an item on their project.
create or replace function public.owns_project_using_statement(p_statement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1
    from public.checklist_items i
    join public.competence_statements s on s.id = i.competence_statement_id
    where i.competence_statement_id = p_statement_id
      and s.status = 'submitted'
      and public.is_project_reviewer(i.project_id)
  );
$$;

-------------------------------------------------------------------------------
-- Reviews
-------------------------------------------------------------------------------

create type public.review_decision as enum ('satisfied', 'needs_info');

create table public.reviews (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references public.projects (id) on delete cascade,
  checklist_item_id       uuid not null references public.checklist_items (id) on delete cascade,
  member_id               uuid not null references public.project_members (id) on delete cascade,
  competence_statement_id uuid not null references public.competence_statements (id),
  statement_version       integer not null,
  statement_sha256        text not null,
  reviewer_id             uuid not null references auth.users (id),
  decision                public.review_decision not null,
  note                    text not null default '',
  created_at              timestamptz not null default now(),
  ip_address              inet
);

create index reviews_item_idx on public.reviews (checklist_item_id, created_at desc);

create trigger reviews_append_only
  before update or delete on public.reviews
  for each row execute function public.block_changes();

alter table public.reviews enable row level security;

-- Keeps the client-side "check competence" items in step with the reviews:
-- complete once everyone they cover has been marked satisfied.
create function public.refresh_review_items(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule record;
  v_total integer;
  v_done integer;
  v_status public.item_status;
begin
  for v_rule in
    select * from (values
      ('CL-11E-REVIEW-PD', array['principal_designer']::public.dutyholder_role[]),
      ('CL-11E-REVIEW-PC', array['principal_contractor']::public.dutyholder_role[]),
      ('CL-11E-REVIEW-ENGAGED', array['designer', 'contractor']::public.dutyholder_role[])
    ) as r(code, roles)
  loop
    select count(*), count(*) filter (where i.status = 'complete')
    into v_total, v_done
    from public.checklist_items i
    join public.project_members m on m.id = i.member_id
    where i.project_id = p_project_id
      and i.template_code = 'ALL-11F-COMPETENCE'
      and i.withdrawn_at is null
      and m.removed_at is null
      and m.role = any (v_rule.roles);

    v_status := case
      when v_total > 0 and v_done = v_total then 'complete'
      when v_done > 0 then 'in_progress'
      else 'not_started'
    end::public.item_status;

    update public.checklist_items
    set status = v_status,
        completed_at = case when v_status = 'complete' then coalesce(completed_at, now()) else null end,
        updated_at = now()
    where project_id = p_project_id
      and template_code = v_rule.code
      and withdrawn_at is null
      and status is distinct from v_status;
  end loop;
end;
$$;

-- Re-check the review items whenever checklist items appear or are
-- withdrawn (someone joins, leaves, or a set-up answer changes). Only fires
-- on those columns, so refresh_review_items' own status updates don't loop.
create function public.checklist_items_refresh_reviews()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_review_items(new.project_id);
  return null;
end;
$$;

create trigger checklist_items_refresh_reviews
  after insert or update of withdrawn_at on public.checklist_items
  for each row execute function public.checklist_items_refresh_reviews();

create function public.review_competence(p_item_id uuid, p_decision public.review_decision, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item      public.checklist_items;
  v_member    public.project_members;
  v_statement public.competence_statements;
  v_review    uuid;
begin
  select * into v_item from public.checklist_items
  where id = p_item_id and template_code = 'ALL-11F-COMPETENCE' and withdrawn_at is null;
  if not found then
    raise exception 'Competence statement not found';
  end if;
  if not public.is_project_reviewer(v_item.project_id) then
    raise exception 'Only the project owner or the client can review competence';
  end if;

  select * into v_member from public.project_members where id = v_item.member_id and removed_at is null;
  if not found then
    raise exception 'This person is no longer on the project';
  end if;
  if v_member.user_id = auth.uid() then
    raise exception 'You cannot review your own competence statement';
  end if;
  if v_item.status <> 'submitted' or v_item.competence_statement_id is null then
    raise exception 'There is no submitted statement waiting for review';
  end if;
  if p_decision = 'needs_info' and length(trim(coalesce(p_note, ''))) = 0 then
    raise exception 'Say what more information is needed';
  end if;

  select * into v_statement from public.competence_statements where id = v_item.competence_statement_id;

  insert into public.reviews (project_id, checklist_item_id, member_id, competence_statement_id, statement_version,
                              statement_sha256, reviewer_id, decision, note, ip_address)
  values (v_item.project_id, v_item.id, v_member.id, v_statement.id, v_statement.version,
          v_statement.content_sha256, auth.uid(), p_decision, trim(coalesce(p_note, '')), public.request_ip())
  returning id into v_review;

  update public.checklist_items
  set status = case when p_decision = 'satisfied' then 'complete' else 'needs_info' end::public.item_status,
      completed_at = case when p_decision = 'satisfied' then now() else null end,
      updated_at = now()
  where id = v_item.id;

  perform public.refresh_review_items(v_item.project_id);

  perform public.write_project_audit(v_item.project_id, 'competence.reviewed', 'checklist_item', v_item.id::text,
    jsonb_build_object('review_id', v_review, 'decision', p_decision, 'member_id', v_member.id,
                       'statement_version', v_statement.version, 'statement_sha256', v_statement.content_sha256));
  return v_review;
end;
$$;

-- Replaces the phase 3 version: after "needs more info", the dutyholder must
-- submit an updated version rather than relink the one already reviewed.
create or replace function public.submit_competence(p_item_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item      public.checklist_items := public.assert_my_item(p_item_id);
  v_member    public.project_members;
  v_project   public.projects;
  v_statement public.competence_statements;
  v_sha       text;
begin
  if v_item.template_code <> 'ALL-11F-COMPETENCE' then
    raise exception 'This task is not a competence statement';
  end if;
  if v_item.status in ('submitted', 'complete') then
    raise exception 'Your competence statement has already been submitted for this project';
  end if;

  select * into v_member from public.project_members where id = v_item.member_id;
  select * into v_project from public.projects where id = v_item.project_id;

  select * into v_statement from public.competence_statements
  where user_id = auth.uid() and status = 'draft';

  if not found then
    if v_item.status = 'needs_info' then
      raise exception 'Update your statement before resubmitting it';
    end if;
    select * into v_statement from public.competence_statements
    where user_id = auth.uid() and status = 'submitted'
    order by version desc limit 1;
    if not found then
      raise exception 'Fill in your competence statement first';
    end if;
  end if;

  if trim(v_statement.skills) = '' or trim(v_statement.knowledge) = '' or trim(v_statement.experience) = ''
     or trim(v_statement.behaviour_compliance) = '' or trim(v_statement.behaviour_cooperation) = ''
     or trim(v_statement.behaviour_limits) = '' then
    raise exception 'Answer every question before submitting';
  end if;
  if v_member.is_firm and trim(v_statement.organisational_capability) = '' then
    raise exception 'Describe your firm''s organisational capability before submitting';
  end if;
  if v_project.is_higher_risk and v_statement.has_serious_sanctions is null then
    raise exception 'Answer the serious sanctions question before submitting';
  end if;

  if v_statement.status = 'draft' then
    v_sha := public.sha256_hex(
      jsonb_build_object(
        'skills', v_statement.skills, 'knowledge', v_statement.knowledge,
        'experience', v_statement.experience,
        'behaviour_compliance', v_statement.behaviour_compliance,
        'behaviour_cooperation', v_statement.behaviour_cooperation,
        'behaviour_limits', v_statement.behaviour_limits,
        'organisational_capability', v_statement.organisational_capability,
        'has_serious_sanctions', v_statement.has_serious_sanctions,
        'sanctions_details', v_statement.sanctions_details,
        'evidence', (
          select coalesce(jsonb_agg(d.sha256 order by d.sha256), '[]'::jsonb)
          from public.competence_evidence ce join public.documents d on d.id = ce.document_id
          where ce.statement_id = v_statement.id
        )
      )::text
    );
    update public.competence_statements
    set status = 'submitted', submitted_at = now(), content_sha256 = v_sha
    where id = v_statement.id;
  end if;

  update public.checklist_items
  set status = 'submitted', competence_statement_id = v_statement.id, updated_at = now(),
      answer = jsonb_build_object('competence_statement_id', v_statement.id, 'version', v_statement.version)
  where id = v_item.id;

  perform public.refresh_review_items(v_item.project_id);

  perform public.write_project_audit(v_item.project_id, 'item.submitted', 'checklist_item', v_item.id::text,
    jsonb_build_object('code', v_item.template_code, 'competence_statement_id', v_statement.id,
                       'version', v_statement.version));
  return v_statement.id;
end;
$$;

-------------------------------------------------------------------------------
-- Report a change in competence (reg 11I)
-------------------------------------------------------------------------------

create table public.competence_change_reports (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  member_id  uuid not null references public.project_members (id) on delete cascade,
  user_id    uuid not null references auth.users (id),
  note       text not null check (length(trim(note)) > 0),
  created_at timestamptz not null default now(),
  ip_address inet
);

create trigger competence_change_reports_append_only
  before update or delete on public.competence_change_reports
  for each row execute function public.block_changes();

alter table public.competence_change_reports enable row level security;

-- Records the report and sends the person's competence back for review on
-- that project.
create function public.report_competence_change(p_project_id uuid, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.project_members;
  v_report uuid;
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  if length(trim(coalesce(p_note, ''))) = 0 then
    raise exception 'Describe what has changed';
  end if;

  select m.* into v_member
  from public.project_members m
  join public.checklist_items i on i.member_id = m.id
  where m.project_id = p_project_id and m.user_id = auth.uid() and m.removed_at is null
    and i.template_code = 'ALL-11F-COMPETENCE' and i.withdrawn_at is null
  limit 1;
  if not found then
    raise exception 'You have no competence duties on this project';
  end if;

  insert into public.competence_change_reports (project_id, member_id, user_id, note, ip_address)
  values (p_project_id, v_member.id, auth.uid(), trim(p_note), public.request_ip())
  returning id into v_report;

  update public.checklist_items i
  set status = 'needs_info', completed_at = null, updated_at = now()
  from public.project_members m
  where m.id = i.member_id and m.user_id = auth.uid() and m.removed_at is null
    and i.project_id = p_project_id
    and i.template_code = 'ALL-11F-COMPETENCE'
    and i.withdrawn_at is null
    and i.status in ('submitted', 'complete');

  perform public.refresh_review_items(p_project_id);

  perform public.write_project_audit(p_project_id, 'competence.change_reported', 'project_member', v_member.id::text,
    jsonb_build_object('report_id', v_report));
  return v_report;
end;
$$;

-------------------------------------------------------------------------------
-- Appointments
-------------------------------------------------------------------------------

create type public.appointment_kind as enum (
  'pd_appointment', 'pc_appointment', 'lead_designer_agreement', 'cdm_certification'
);

create table public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  kind                public.appointment_kind not null,
  appointee_member_id uuid not null references public.project_members (id),
  -- The exact words issued for signature, frozen and fingerprinted.
  letter_title        text not null,
  letter_text         text not null,
  letter_sha256       text not null,
  template_version    text not null,
  status              text not null default 'awaiting_signatures'
                        check (status in ('awaiting_signatures', 'signed', 'void')),
  created_by          uuid not null references auth.users (id),
  created_at          timestamptz not null default now(),
  completed_at        timestamptz,
  voided_at           timestamptz,
  void_reason         text
);

-- One live appointment of each kind per project.
create unique index appointments_one_live
  on public.appointments (project_id, kind) where status <> 'void';

-- Who must sign, fixed when the letter is issued.
create table public.appointment_signatories (
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  member_id      uuid not null references public.project_members (id),
  party          text not null check (party in ('appointer', 'appointee', 'designer')),
  primary key (appointment_id, member_id, party)
);

create table public.appointment_signatures (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  member_id      uuid not null references public.project_members (id),
  user_id        uuid not null references auth.users (id),
  party          text not null,
  typed_name     text not null,
  letter_sha256  text not null,
  signed_at      timestamptz not null default now(),
  ip_address     inet,
  user_agent     text,
  unique (appointment_id, member_id, party),
  foreign key (appointment_id, member_id, party)
    references public.appointment_signatories (appointment_id, member_id, party)
);

create trigger appointment_signatures_append_only
  before update or delete on public.appointment_signatures
  for each row execute function public.block_changes();

create trigger appointment_signatories_append_only
  before update or delete on public.appointment_signatories
  for each row execute function public.block_changes();

-- Letters are frozen once issued; only the status fields may change.
create function public.appointments_on_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.letter_text, new.letter_sha256, new.letter_title, new.kind, new.appointee_member_id, new.project_id)
     is distinct from
     (old.letter_text, old.letter_sha256, old.letter_title, old.kind, old.appointee_member_id, old.project_id) then
    raise exception 'An issued letter cannot be edited; void it and issue a new one';
  end if;
  return new;
end;
$$;

create trigger appointments_frozen
  before update on public.appointments
  for each row execute function public.appointments_on_update();

create trigger appointments_no_delete
  before delete on public.appointments
  for each row execute function public.block_changes();

alter table public.appointments enable row level security;
alter table public.appointment_signatories enable row level security;
alter table public.appointment_signatures enable row level security;

-- Which checklist item each kind of appointment completes for its appointer
-- or designer signatories.
create function public.appointment_item_code(p_kind public.appointment_kind)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_kind
    when 'pd_appointment' then 'CL-11D-APPOINT-PD'
    when 'pc_appointment' then 'CL-11D-APPOINT-PC'
    when 'lead_designer_agreement' then 'DES-11D-LEAD'
    when 'cdm_certification' then 'CL-11D-CDM'
  end;
$$;

create function public.prepare_appointment(
  p_project_id          uuid,
  p_kind                public.appointment_kind,
  p_appointee_member_id uuid,
  p_letter_title        text,
  p_letter_text         text,
  p_template_version    text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project     public.projects;
  v_appointee   public.project_members;
  v_code        text := public.appointment_item_code(p_kind);
  v_appointment uuid;
  v_sha         text;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'Only the project owner can prepare appointments';
  end if;
  select * into v_project from public.projects where id = p_project_id;

  if p_kind in ('pd_appointment', 'pc_appointment') and v_project.expected_contractors <= 1 then
    raise exception 'Principal appointments are only needed where more than one contractor is involved';
  end if;
  if p_kind = 'lead_designer_agreement' and v_project.expected_contractors > 1 then
    raise exception 'A lead designer agreement is only needed where there is one contractor';
  end if;
  if p_kind = 'cdm_certification' and not v_project.cdm_pd_certified then
    raise exception 'This project does not use the CDM certification option';
  end if;

  select * into v_appointee from public.project_members
  where id = p_appointee_member_id and project_id = p_project_id and removed_at is null;
  if not found then
    raise exception 'Choose someone on the project';
  end if;
  if (p_kind in ('pd_appointment', 'cdm_certification') and v_appointee.role <> 'principal_designer')
     or (p_kind = 'pc_appointment' and v_appointee.role <> 'principal_contractor')
     or (p_kind = 'lead_designer_agreement' and v_appointee.role not in ('designer', 'principal_designer')) then
    raise exception 'That person does not hold the right role for this appointment';
  end if;

  if length(trim(coalesce(p_letter_text, ''))) = 0 then
    raise exception 'The letter is empty';
  end if;
  v_sha := public.sha256_hex(p_letter_text);

  insert into public.appointments (project_id, kind, appointee_member_id, letter_title, letter_text, letter_sha256,
                                   template_version, created_by)
  values (p_project_id, p_kind, v_appointee.id, p_letter_title, p_letter_text, v_sha, p_template_version, auth.uid())
  returning id into v_appointment;

  -- The holders of the matching checklist item sign as appointer (or, for
  -- the lead designer agreement, as designers).
  insert into public.appointment_signatories (appointment_id, member_id, party)
  select v_appointment, i.member_id,
         case when p_kind = 'lead_designer_agreement' then 'designer' else 'appointer' end
  from public.checklist_items i
  join public.project_members m on m.id = i.member_id
  where i.project_id = p_project_id and i.template_code = v_code
    and i.withdrawn_at is null and m.removed_at is null;

  if not found then
    raise exception 'Nobody on the project holds this duty yet; add the client (or designers) first';
  end if;

  if p_kind in ('pd_appointment', 'pc_appointment') then
    insert into public.appointment_signatories (appointment_id, member_id, party)
    values (v_appointment, v_appointee.id, 'appointee');
  end if;

  update public.checklist_items
  set status = 'in_progress', updated_at = now()
  where project_id = p_project_id and template_code = v_code and withdrawn_at is null and status = 'not_started';

  perform public.write_project_audit(p_project_id, 'appointment.prepared', 'appointment', v_appointment::text,
    jsonb_build_object('kind', p_kind, 'appointee_member_id', v_appointee.id, 'letter_sha256', v_sha,
                       'template_version', p_template_version));
  return v_appointment;
end;
$$;

create function public.void_appointment(p_appointment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments;
begin
  select * into v_appointment from public.appointments where id = p_appointment_id;
  if not found or not public.is_project_owner(v_appointment.project_id) then
    raise exception 'Only the project owner can void an appointment';
  end if;
  if v_appointment.status = 'void' then
    raise exception 'This appointment is already void';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Give a reason';
  end if;

  update public.appointments
  set status = 'void', voided_at = now(), void_reason = trim(p_reason)
  where id = v_appointment.id;

  update public.checklist_items
  set status = 'not_started', completed_at = null, updated_at = now()
  where project_id = v_appointment.project_id
    and template_code = public.appointment_item_code(v_appointment.kind)
    and withdrawn_at is null;

  perform public.write_project_audit(v_appointment.project_id, 'appointment.voided', 'appointment',
    v_appointment.id::text, jsonb_build_object('reason', trim(p_reason), 'was', v_appointment.status));
end;
$$;

create function public.sign_appointment(
  p_appointment_id uuid,
  p_party          text,
  p_typed_name     text,
  p_user_agent     text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments;
  v_member      uuid;
  v_profile     text;
  v_signature   uuid;
  v_code        text;
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;

  select * into v_appointment from public.appointments where id = p_appointment_id for update;
  if not found or v_appointment.status <> 'awaiting_signatures' then
    raise exception 'This appointment is not waiting for signatures';
  end if;

  select s.member_id into v_member
  from public.appointment_signatories s
  join public.project_members m on m.id = s.member_id
  where s.appointment_id = v_appointment.id and s.party = p_party
    and m.user_id = auth.uid() and m.removed_at is null
    and not exists (
      select 1 from public.appointment_signatures g
      where g.appointment_id = s.appointment_id and g.member_id = s.member_id and g.party = s.party
    )
  limit 1;
  if v_member is null then
    raise exception 'There is nothing here for you to sign';
  end if;

  select full_name into v_profile from public.profiles where id = auth.uid();
  if length(public.normalise_name(p_typed_name)) < 2
     or public.normalise_name(p_typed_name) <> public.normalise_name(v_profile) then
    raise exception 'Type your full name exactly as it appears on your account: %', v_profile;
  end if;

  insert into public.appointment_signatures (appointment_id, member_id, user_id, party, typed_name, letter_sha256,
                                             ip_address, user_agent)
  values (v_appointment.id, v_member, auth.uid(), p_party, trim(p_typed_name), v_appointment.letter_sha256,
          public.request_ip(), left(p_user_agent, 500))
  returning id into v_signature;

  perform public.write_project_audit(v_appointment.project_id, 'appointment.signed', 'appointment',
    v_appointment.id::text, jsonb_build_object('party', p_party, 'member_id', v_member, 'signature_id', v_signature,
                                               'letter_sha256', v_appointment.letter_sha256));

  v_code := public.appointment_item_code(v_appointment.kind);

  -- A designer's own lead designer item completes when they sign.
  if p_party = 'designer' then
    update public.checklist_items
    set status = 'complete', completed_at = now(), updated_at = now()
    where member_id = v_member and template_code = v_code and withdrawn_at is null;
  end if;

  -- Fully signed: close the appointment and the appointer's items.
  if not exists (
    select 1 from public.appointment_signatories s
    where s.appointment_id = v_appointment.id
      and not exists (
        select 1 from public.appointment_signatures g
        where g.appointment_id = s.appointment_id and g.member_id = s.member_id and g.party = s.party
      )
  ) then
    update public.appointments set status = 'signed', completed_at = now() where id = v_appointment.id;
    update public.checklist_items
    set status = 'complete', completed_at = now(), updated_at = now()
    where project_id = v_appointment.project_id and template_code = v_code and withdrawn_at is null;
    perform public.write_project_audit(v_appointment.project_id, 'appointment.completed', 'appointment',
      v_appointment.id::text, jsonb_build_object('kind', v_appointment.kind));
  end if;

  return v_signature;
end;
$$;

-------------------------------------------------------------------------------
-- Row Level Security policies
-------------------------------------------------------------------------------

create policy "Reviewers and the reviewed person read reviews"
  on public.reviews for select to authenticated
  using (
    public.is_aal2() and (
      public.is_project_reviewer(project_id)
      or exists (select 1 from public.project_members m where m.id = member_id and m.user_id = auth.uid())
    )
  );

create policy "Reporters and reviewers read change reports"
  on public.competence_change_reports for select to authenticated
  using (public.is_aal2() and (user_id = auth.uid() or public.is_project_reviewer(project_id)));

create policy "Members read their project's appointments"
  on public.appointments for select to authenticated
  using (public.is_project_member(project_id));

create policy "Members read appointment signatories"
  on public.appointment_signatories for select to authenticated
  using (exists (
    select 1 from public.appointments a where a.id = appointment_id and public.is_project_member(a.project_id)
  ));

create policy "Members read appointment signatures"
  on public.appointment_signatures for select to authenticated
  using (exists (
    select 1 from public.appointments a where a.id = appointment_id and public.is_project_member(a.project_id)
  ));

-------------------------------------------------------------------------------
-- Permissions
-------------------------------------------------------------------------------

revoke all on public.reviews, public.competence_change_reports, public.appointments,
              public.appointment_signatories, public.appointment_signatures
  from anon, authenticated;
grant select on public.reviews, public.competence_change_reports, public.appointments,
                public.appointment_signatories, public.appointment_signatures
  to authenticated;

revoke execute on function
  public.is_project_reviewer(uuid),
  public.refresh_review_items(uuid),
  public.checklist_items_refresh_reviews(),
  public.review_competence(uuid, public.review_decision, text),
  public.report_competence_change(uuid, text),
  public.appointments_on_update(),
  public.appointment_item_code(public.appointment_kind),
  public.prepare_appointment(uuid, public.appointment_kind, uuid, text, text, text),
  public.void_appointment(uuid, text),
  public.sign_appointment(uuid, text, text, text)
from public, anon, authenticated;

grant execute on function public.is_project_reviewer(uuid) to authenticated;
grant execute on function
  public.review_competence(uuid, public.review_decision, text),
  public.report_competence_change(uuid, text),
  public.prepare_appointment(uuid, public.appointment_kind, uuid, text, text, text),
  public.void_appointment(uuid, text),
  public.sign_appointment(uuid, text, text, text)
to authenticated;
