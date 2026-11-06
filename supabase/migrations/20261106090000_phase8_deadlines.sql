-- Phase 8: statutory deadlines (PLAN.md, "Key deadlines").
--
-- Each legal clock starts from its own trigger event:
--   * 14 days (reg 11O): from a principal appointment signed on or after the
--     building control application date -> notify building control.
--   * 28 days (reg 11M(5)(b), 11N(5)(b)): from the end of a principal
--     designer's or principal contractor's appointment -> handover document.
--   * 5 days (reg 16(4), (4A)): from the work being completed -> signed
--     completion statements from the client and EACH principal designer and
--     principal contractor (former ones too).
--   * 5 days before (reg 16(5), (5A)): early occupation -> notice.
--
-- Trigger dates live on projects (building control application, construction
-- started, work completed, early occupation) and on project_members
-- (appointment_ended_on). refresh_deadlines() turns them into due dates on
-- checklist items, so the existing task lists, dashboard and chasing pick
-- them up. "Construction started" is refused until both principal
-- appointments are signed (reg 11D(3)).
--
-- Security model is unchanged: only the owner can record dates (existing
-- "Owners update" policies, plus the column grants below), everything
-- requires aal2, and every change is written to audit_log.

-------------------------------------------------------------------------------
-- Trigger dates
-------------------------------------------------------------------------------

alter table public.projects
  add column bc_application_date    date,
  add column construction_started_on date,
  add column work_completed_on      date,
  add column occupation_date        date;

-- Set when a principal designer's or principal contractor's appointment
-- ends. They stay on the project (not removed) so they can still be chased
-- for the handover and sign at completion.
alter table public.project_members
  add column appointment_ended_on date;

grant update (bc_application_date, construction_started_on, work_completed_on, occupation_date)
  on public.projects to authenticated;
grant update (appointment_ended_on) on public.project_members to authenticated;

-- Legal-deadline reminders are their own kind of chase.
alter table public.reminders drop constraint reminders_kind_check;
alter table public.reminders add constraint reminders_kind_check
  check (kind in ('nudge', 'reminder', 'firm', 'owner_digest', 'manual', 'deadline'));

-- The project's own calendar date (UK time), following project_now().
create function public.project_today(p_project_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (public.project_now(p_project_id) at time zone 'Europe/London')::date;
$$;

-- Checks on the project's trigger dates.
create function public.projects_check_dates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (public.project_now(new.id) at time zone 'Europe/London')::date;
begin
  if new.bc_application_date is distinct from old.bc_application_date
     and new.bc_application_date > v_today then
    raise exception 'The building control application date can''t be in the future';
  end if;

  if new.construction_started_on is distinct from old.construction_started_on
     and new.construction_started_on is not null then
    if new.construction_started_on > v_today then
      raise exception 'The construction start date can''t be in the future';
    end if;
    -- 11D(3): with more than one contractor, both principals must be
    -- appointed in writing before the construction phase begins.
    if new.expected_contractors > 1 and (
      not exists (select 1 from public.appointments
                  where project_id = new.id and kind = 'pd_appointment' and status = 'signed')
      or not exists (select 1 from public.appointments
                     where project_id = new.id and kind = 'pc_appointment' and status = 'signed')
    ) then
      raise exception 'Both the principal designer and principal contractor appointments must be signed before construction starts (reg 11D(3))';
    end if;
  end if;

  if new.work_completed_on is distinct from old.work_completed_on
     and new.work_completed_on is not null then
    if new.work_completed_on > v_today then
      raise exception 'The completion date can''t be in the future';
    end if;
    if new.construction_started_on is null then
      raise exception 'Record when construction started before marking the work complete';
    end if;
    if new.work_completed_on < new.construction_started_on then
      raise exception 'The work can''t be complete before construction started';
    end if;
  end if;

  if new.construction_started_on is null and new.work_completed_on is not null then
    raise exception 'Clear the completion date before clearing the construction start date';
  end if;
  return new;
end;
$$;

create trigger projects_check_dates
  before update of bc_application_date, construction_started_on, work_completed_on, occupation_date
  on public.projects
  for each row execute function public.projects_check_dates();

-- Checks on appointment end dates: only principals have one.
create function public.project_members_check_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contractors integer;
begin
  if new.appointment_ended_on is not distinct from old.appointment_ended_on
     or new.appointment_ended_on is null then
    return new;
  end if;
  select expected_contractors into v_contractors from public.projects where id = new.project_id;
  if not (new.role in ('principal_designer', 'principal_contractor')
          or (new.role = 'contractor' and v_contractors = 1)) then
    raise exception 'Only a principal designer or principal contractor has an appointment end date';
  end if;
  if new.appointment_ended_on > public.project_today(new.project_id) then
    raise exception 'The appointment end date can''t be in the future';
  end if;
  return new;
end;
$$;

create trigger project_members_check_end
  before update of appointment_ended_on on public.project_members
  for each row execute function public.project_members_check_end();

-------------------------------------------------------------------------------
-- New duties
-------------------------------------------------------------------------------

insert into public.duty_templates
  (code, roles, title, explanation, legal_reference, legislation_url, item_type, conditions, domestic_transfer_to, sort_order)
values
  ('CL-16-COMPLETION', '{client}',
   'Sign your completion statement',
   'Within 5 days of the building work being completed, the completion notice to building control must include a statement signed by the client that, to the best of their knowledge, the work complies with the applicable requirements of the Building Regulations.',
   'Reg 16(4A)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/16',
   'acknowledge', '{}', null, 120),

  ('PC-11N-HANDOVER', '{principal_contractor}',
   'Give the client your handover document',
   'Within 28 days of your appointment ending, give the client a document explaining the arrangements you made to plan, manage and monitor the building work.',
   'Reg 11N(5)(b)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11N',
   'form', '{}', null, 530),

  ('PC-16-OCCUPATION', '{principal_contractor}',
   'Give notice before early occupation',
   'If any part of the building will be occupied before the work is complete, building control must be given notice at least 5 days before it is occupied.',
   'Reg 16(5), (5A)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/16',
   'form', '{"early_occupation": true}', null, 540),

  ('PC-16-COMPLETION', '{principal_contractor}',
   'Sign your completion statement',
   'Within 5 days of the building work being completed, the completion notice must include a statement signed by each principal contractor, giving their appointment dates and confirming they fulfilled their duties under Part 2A.',
   'Reg 16(4A)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/16',
   'acknowledge', '{}', null, 550),

  ('PD-16-COMPLETION', '{principal_designer}',
   'Sign your completion statement',
   'Within 5 days of the building work being completed, the completion notice must include a statement signed by each principal designer, giving their appointment dates and confirming they fulfilled their duties under Part 2A.',
   'Reg 16(4A)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/16',
   'acknowledge', '{}', null, 640);

-------------------------------------------------------------------------------
-- Due dates from trigger events
-------------------------------------------------------------------------------

-- The due date each deadline item should have right now (null = its clock
-- hasn't started).
create function public.deadline_due_dates(p_project_id uuid)
returns table (item_id uuid, due date)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id,
    case i.template_code
      when 'PD-11M-HANDOVER' then m.appointment_ended_on + 28
      when 'PC-11N-HANDOVER' then m.appointment_ended_on + 28
      when 'CL-16-COMPLETION' then p.work_completed_on + 5
      when 'PD-16-COMPLETION' then p.work_completed_on + 5
      when 'PC-16-COMPLETION' then p.work_completed_on + 5
      when 'PC-16-OCCUPATION' then p.occupation_date - 5
      -- 11O: 14 days from the first principal appointment made on or after
      -- the building control application. Appointments made before it are
      -- named in the application itself.
      when 'CL-11O-NOTIFY' then (
        select min((a.completed_at at time zone 'Europe/London')::date) + 14
        from public.appointments a
        where a.project_id = p.id and a.kind in ('pd_appointment', 'pc_appointment')
          and a.completed_at is not null and a.status <> 'void'
          and p.bc_application_date is not null
          and (a.completed_at at time zone 'Europe/London')::date >= p.bc_application_date)
    end
  from public.checklist_items i
  join public.project_members m on m.id = i.member_id
  join public.projects p on p.id = i.project_id
  where i.project_id = p_project_id
    and i.template_code in ('PD-11M-HANDOVER', 'PC-11N-HANDOVER', 'CL-16-COMPLETION', 'PD-16-COMPLETION',
                            'PC-16-COMPLETION', 'PC-16-OCCUPATION', 'CL-11O-NOTIFY');
$$;

-- Brings every deadline item's due date in line with the trigger dates, and
-- logs each change.
create function public.refresh_deadlines(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changed jsonb;
begin
  with changed as (
    update public.checklist_items i
    set due_date = d.due, updated_at = now()
    from public.deadline_due_dates(p_project_id) d
    where i.id = d.item_id and i.due_date is distinct from d.due
    returning i.id, i.member_id, i.template_code, i.due_date
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'item_id', id, 'member_id', member_id, 'code', template_code, 'due_date', due_date)), '[]')
  into v_changed from changed;

  if v_changed <> '[]' then
    perform public.write_project_audit(p_project_id, 'deadline.updated', 'project', p_project_id::text,
      jsonb_build_object('items', v_changed));
  end if;
end;
$$;

-------------------------------------------------------------------------------
-- The checklist engine, now aware of early occupation and deadlines
-------------------------------------------------------------------------------

create or replace function public.checklist_wanted(p_project_id uuid)
returns table (member_id uuid, template_id uuid, template_code text)
language sql
stable
security definer
set search_path = ''
as $$
  with p as (
    select * from public.projects where id = p_project_id
  ),
  members as (
    -- A sole contractor is automatically the principal contractor (11D).
    select m.id, m.is_firm,
           array_remove(array[
             m.role,
             case when m.role = 'contractor' and p.expected_contractors = 1
                  then 'principal_contractor'::public.dutyholder_role end
           ], null) as eff_roles
    from public.project_members m cross join p
    where m.project_id = p.id and m.removed_at is null and m.role is not null
  ),
  templates as (
    -- Domestic client (11C): client duties move to someone else.
    select t.*,
           case when p.is_domestic_client and 'client' = any (t.roles) then
             array_remove(t.roles, 'client'::public.dutyholder_role) ||
             case when p.domestic_duties_to_pd then 'principal_designer'::public.dutyholder_role
                  else coalesce(t.domestic_transfer_to, 'principal_contractor'::public.dutyholder_role) end
           else t.roles end as target_roles
    from public.duty_templates t cross join p
    where t.superseded_at is null
  )
  select m.id, t.id, t.code
  from members m
  join templates t on m.eff_roles && t.target_roles
  cross join p
  where (not t.conditions ? 'multiple_contractors'
         or (t.conditions ->> 'multiple_contractors')::boolean = (p.expected_contractors > 1))
    and (not t.conditions ? 'domestic_client'
         or (t.conditions ->> 'domestic_client')::boolean = p.is_domestic_client)
    and (not t.conditions ? 'cdm_pd_certified'
         or (t.conditions ->> 'cdm_pd_certified')::boolean = p.cdm_pd_certified)
    and (not t.conditions ? 'member_is_firm'
         or (t.conditions ->> 'member_is_firm')::boolean = m.is_firm)
    and (not t.conditions ? 'early_occupation'
         or (t.conditions ->> 'early_occupation')::boolean = (p.occupation_date is not null));
$$;

-- As before, then refreshes the deadline due dates.
create or replace function public.generate_checklist(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_added     jsonb;
  v_restored  jsonb;
  v_withdrawn jsonb;
begin
  -- Restore items that apply again.
  with restored as (
    update public.checklist_items i
    set withdrawn_at = null, updated_at = now()
    from public.checklist_wanted(p_project_id) w
    where i.member_id = w.member_id and i.template_code = w.template_code
      and i.withdrawn_at is not null
    returning i.member_id, i.template_code
  )
  select coalesce(jsonb_agg(jsonb_build_object('member_id', member_id, 'code', template_code)), '[]')
  into v_restored from restored;

  -- Add new items.
  with added as (
    insert into public.checklist_items (project_id, member_id, template_id, template_code)
    select p_project_id, w.member_id, w.template_id, w.template_code
    from public.checklist_wanted(p_project_id) w
    on conflict (member_id, template_code) do nothing
    returning member_id, template_code
  )
  select coalesce(jsonb_agg(jsonb_build_object('member_id', member_id, 'code', template_code)), '[]')
  into v_added from added;

  -- Withdraw items that no longer apply.
  with withdrawn as (
    update public.checklist_items i
    set withdrawn_at = now(), updated_at = now()
    where i.project_id = p_project_id
      and i.withdrawn_at is null
      and not exists (
        select 1 from public.checklist_wanted(p_project_id) w
        where w.member_id = i.member_id and w.template_code = i.template_code
      )
    returning i.member_id, i.template_code
  )
  select coalesce(jsonb_agg(jsonb_build_object('member_id', member_id, 'code', template_code)), '[]')
  into v_withdrawn from withdrawn;

  if v_added <> '[]' or v_restored <> '[]' or v_withdrawn <> '[]' then
    perform public.write_project_audit(
      p_project_id, 'checklist.generated', 'project', p_project_id::text,
      jsonb_build_object('added', v_added, 'restored', v_restored, 'withdrawn', v_withdrawn)
    );
  end if;

  perform public.refresh_deadlines(p_project_id);
end;
$$;

-- Re-run when a trigger date changes on the project...
create trigger projects_regenerate_on_dates
  after update of bc_application_date, construction_started_on, work_completed_on, occupation_date
  on public.projects
  for each row execute function public.projects_after_update();

-- ...or an appointment is signed or voided (the 11O clock). Members already
-- re-run generate_checklist on every change.
create function public.appointments_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_deadlines(new.project_id);
  return null;
end;
$$;

create trigger appointments_refresh_deadlines
  after insert or update of status, completed_at on public.appointments
  for each row execute function public.appointments_after_change();

-- Bring existing projects up to date (adds the new duties to everyone).
do $$
declare
  v_id uuid;
begin
  for v_id in select id from public.projects loop
    perform public.generate_checklist(v_id);
  end loop;
end;
$$;

-------------------------------------------------------------------------------
-- Completion statements (reg 16(4A))
-------------------------------------------------------------------------------

create function public.long_date(p_date date)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(p_date, 'FMDD FMMonth YYYY');
$$;

-- The exact words a completion statement says, filled in from the records.
-- Null for any other item. Refuses until the work is marked complete, and
-- refuses a principal whose appointment dates aren't recorded.
create function public.completion_statement_text(p_item_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_item     public.checklist_items;
  v_template public.duty_templates;
  v_member   public.project_members;
  v_project  public.projects;
  v_name     text;
  v_kind     public.appointment_kind;
  v_label    text;
  v_from     date;
  v_until    text;
  v_role_end date;
begin
  select * into v_item from public.checklist_items where id = p_item_id;
  if v_item.template_code is null
     or v_item.template_code not in ('CL-16-COMPLETION', 'PD-16-COMPLETION', 'PC-16-COMPLETION') then
    return null;
  end if;
  select * into v_template from public.duty_templates where id = v_item.template_id;
  select * into v_member from public.project_members where id = v_item.member_id;
  select * into v_project from public.projects where id = v_item.project_id;

  if v_project.work_completed_on is null then
    raise exception 'The work hasn''t been marked complete yet, so this statement can''t be signed';
  end if;

  select nullif(full_name, '') into v_name from public.profiles where id = v_member.user_id;
  v_name := coalesce(v_name, nullif(v_member.display_name, ''), v_member.email);

  if v_item.template_code = 'CL-16-COMPLETION' then
    return format(
      'Completion statement (Building Regulations 2010, regulation 16(4A)). Project: %s%s. '
      'I, %s, %s, state that the building work was completed on %s and that, to the best of my knowledge, '
      'the work complies with the applicable requirements of the Building Regulations 2010. [%s v%s]',
      v_project.name, case when v_project.address <> '' then ', ' || v_project.address else '' end,
      v_name,
      case when v_member.role = 'client' then 'the client'
           else 'carrying out the client''s duties under regulation 11C' end,
      public.long_date(v_project.work_completed_on), v_template.code, v_template.version);
  end if;

  if v_item.template_code = 'PD-16-COMPLETION' then
    v_kind := 'pd_appointment';
    v_label := 'principal designer';
  else
    v_kind := 'pc_appointment';
    v_label := 'principal contractor';
  end if;

  select (a.completed_at at time zone 'Europe/London')::date into v_from
  from public.appointments a
  where a.project_id = v_project.id and a.kind = v_kind and a.appointee_member_id = v_member.id
    and a.completed_at is not null
  order by a.completed_at desc
  limit 1;

  v_role_end := coalesce(v_member.appointment_ended_on, v_project.work_completed_on);
  v_until := case when v_member.appointment_ended_on is not null
                  then public.long_date(v_member.appointment_ended_on)
                  else 'the completion of the work on ' || public.long_date(v_project.work_completed_on) end;

  if v_from is null then
    -- A sole contractor is the principal contractor without a separate
    -- appointment (11D(6)).
    if v_kind = 'pc_appointment' and v_member.role = 'contractor' and v_project.expected_contractors = 1 then
      return format(
        'Completion statement (Building Regulations 2010, regulation 16(4A)). Project: %s%s. '
        'I, %s, state that I was the sole contractor on this project, and so its principal contractor under '
        'regulation 11D(6), until %s, and that I fulfilled my duties as principal contractor under Part 2A of '
        'the Building Regulations 2010. [%s v%s]',
        v_project.name, case when v_project.address <> '' then ', ' || v_project.address else '' end,
        v_name, v_until, v_template.code, v_template.version);
    end if;
    raise exception 'Your signed appointment as % isn''t recorded in Dutyholder, so this statement can''t give your appointment dates. Ask the project owner.', v_label;
  end if;

  return format(
    'Completion statement (Building Regulations 2010, regulation 16(4A)). Project: %s%s. '
    'I, %s, state that I was appointed as %s for this project from %s to %s, and that I fulfilled my duties '
    'as %s under Part 2A of the Building Regulations 2010. [%s v%s]',
    v_project.name, case when v_project.address <> '' then ', ' || v_project.address else '' end,
    v_name, v_label, public.long_date(v_from), v_until, v_label, v_template.code, v_template.version);
end;
$$;

-- For the task page: the words you'd be signing. Your own items only.
create function public.statement_to_sign(p_item_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_item public.checklist_items := public.assert_my_item(p_item_id);
begin
  return public.completion_statement_text(v_item.id);
end;
$$;

-- As in phase 3, but completion statements are signed with their own,
-- filled-in wording.
create or replace function public.sign_acknowledgement(p_item_id uuid, p_typed_name text, p_user_agent text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item      public.checklist_items := public.assert_my_item(p_item_id);
  v_template  public.duty_templates;
  v_profile   text;
  v_statement text;
  v_sha       text;
  v_signature uuid;
begin
  select * into v_template from public.duty_templates where id = v_item.template_id;
  if v_template.item_type <> 'acknowledge' then
    raise exception 'This task is not an acknowledgement';
  end if;
  if v_item.status = 'complete' then
    raise exception 'You have already signed this';
  end if;

  select full_name into v_profile from public.profiles where id = auth.uid();
  if length(public.normalise_name(p_typed_name)) < 2
     or public.normalise_name(p_typed_name) <> public.normalise_name(v_profile) then
    raise exception 'Type your full name exactly as it appears on your account: %', v_profile;
  end if;

  v_statement := coalesce(
    public.completion_statement_text(v_item.id),
    format(
      'I confirm I have read and understood this duty and will comply with it. %s (%s). %s [%s v%s]',
      v_template.title, v_template.legal_reference, v_template.explanation, v_template.code, v_template.version
    ));
  v_sha := public.sha256_hex(v_statement);

  insert into public.signatures (
    project_id, checklist_item_id, member_id, user_id, typed_name, statement, statement_sha256,
    template_code, template_version, ip_address, user_agent
  ) values (
    v_item.project_id, v_item.id, v_item.member_id, auth.uid(), trim(p_typed_name), v_statement, v_sha,
    v_template.code, v_template.version, public.request_ip(), left(p_user_agent, 500)
  ) returning id into v_signature;

  update public.checklist_items
  set status = 'complete', completed_at = now(), updated_at = now(),
      answer = jsonb_build_object('signature_id', v_signature)
  where id = v_item.id;

  perform public.write_project_audit(v_item.project_id, 'item.signed', 'checklist_item', v_item.id::text,
    jsonb_build_object('code', v_template.code, 'signature_id', v_signature, 'statement_sha256', v_sha));
  return v_signature;
end;
$$;

-------------------------------------------------------------------------------
-- The chasing job: members' appointment end dates and project dates
-------------------------------------------------------------------------------

create or replace function public.chase_state()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'clock_offset_days', p.clock_offset_days,
        'construction_start_date', p.construction_start_date,
        'work_completed_on', p.work_completed_on))
      from public.projects p where p.status in ('setup', 'active') and not p.is_demo), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'project_id', m.project_id, 'email', m.email, 'user_id', m.user_id,
        'name', coalesce(nullif(pr.full_name, ''), nullif(m.display_name, ''), m.email),
        'role', m.role, 'is_owner', m.is_owner, 'chasing_paused', m.chasing_paused,
        'invited_at', m.invited_at, 'started_at', coalesce(m.invited_at, m.created_at),
        'appointment_ended_on', m.appointment_ended_on))
      from public.project_members m
      join public.projects p on p.id = m.project_id and p.status in ('setup', 'active') and not p.is_demo
      left join public.profiles pr on pr.id = m.user_id
      where m.removed_at is null
        and m.declined_at is null
        -- Someone with an account who hasn't accepted yet isn't chased: the
        -- project isn't theirs until they say yes.
        and not (m.user_id is null and exists (select 1 from auth.users u where lower(u.email) = m.email))
      ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'project_id', i.project_id, 'member_id', i.member_id, 'code', i.template_code,
        'status', i.status, 'title', t.title, 'item_type', t.item_type, 'due_date', i.due_date,
        'legal_reference', t.legal_reference))
      from public.checklist_items i
      join public.duty_templates t on t.id = i.template_id
      join public.projects p on p.id = i.project_id and p.status in ('setup', 'active') and not p.is_demo
      where i.withdrawn_at is null), '[]'::jsonb),
    'appointments', coalesce((
      select jsonb_agg(jsonb_build_object('project_id', a.project_id, 'kind', a.kind, 'status', a.status))
      from public.appointments a where a.status <> 'void'), '[]'::jsonb),
    'pending_signatures', coalesce((
      select jsonb_agg(jsonb_build_object(
        'appointment_id', s.appointment_id, 'member_id', s.member_id, 'party', s.party, 'kind', a.kind,
        'project_id', a.project_id))
      from public.appointment_signatories s
      join public.appointments a on a.id = s.appointment_id and a.status = 'awaiting_signatures'
      where not exists (
        select 1 from public.appointment_signatures g
        where g.appointment_id = s.appointment_id and g.member_id = s.member_id and g.party = s.party
      )), '[]'::jsonb),
    'reminders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'member_id', r.member_id, 'project_id', r.project_id, 'step_key', r.step_key, 'kind', r.kind,
        'recipient_email', r.recipient_email, 'project_day', r.project_day, 'status', r.status,
        'created_at', r.created_at))
      from public.reminders r), '[]'::jsonb)
  );
$$;

-------------------------------------------------------------------------------
-- Function permissions
-------------------------------------------------------------------------------

revoke execute on function
  public.project_today(uuid),
  public.projects_check_dates(),
  public.project_members_check_end(),
  public.deadline_due_dates(uuid),
  public.refresh_deadlines(uuid),
  public.appointments_after_change(),
  public.completion_statement_text(uuid),
  public.statement_to_sign(uuid)
from public, anon, authenticated;

grant execute on function public.statement_to_sign(uuid) to authenticated;
