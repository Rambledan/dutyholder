-- Phase 3: the dutyholder experience.
--   * Invites sent from the project page (invite_project_member).
--   * Typed-name signatures on acknowledgement items (signatures table).
--   * Four-part competence statements that belong to the person, are
--     versioned, autosave as drafts and are frozen once submitted.
--   * Evidence and item uploads in a private storage bucket, each with a
--     SHA-256 fingerprint (documents table). Files are never deleted, only
--     withdrawn with a reason.
--
-- Security model (all policies require aal2):
--   * Dutyholders change only their own items, and only through the
--     functions below, which check ownership and write the audit log.
--   * signatures: the signer and the project owner can read them.
--   * competence_statements: you read and edit your own drafts; a project
--     owner can read a SUBMITTED statement once it is linked to an item on
--     their project. Nobody can change a submitted statement.
--   * documents / storage: you read your own files; project members read
--     files uploaded to their project's items; a project owner reads the
--     evidence attached to a statement submitted to their project.

-------------------------------------------------------------------------------
-- Generic append-only guard
-------------------------------------------------------------------------------

create function public.block_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

-------------------------------------------------------------------------------
-- Tables
-------------------------------------------------------------------------------

alter table public.project_members add column invited_at timestamptz;

create table public.signatures (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  checklist_item_id uuid not null unique references public.checklist_items (id) on delete cascade,
  member_id         uuid not null references public.project_members (id) on delete cascade,
  user_id           uuid not null references auth.users (id),
  typed_name        text not null,
  -- The exact words agreed to, and their fingerprint.
  statement         text not null,
  statement_sha256  text not null,
  template_code     text not null,
  template_version  integer not null,
  signed_at         timestamptz not null default now(),
  ip_address        inet,
  user_agent        text
);

create trigger signatures_append_only
  before update or delete on public.signatures
  for each row execute function public.block_changes();

create table public.competence_statements (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  version                   integer not null,
  status                    text not null default 'draft' check (status in ('draft', 'submitted')),
  -- Reg 11F / 11Q: skills, knowledge, experience and behaviours.
  skills                    text not null default '',
  knowledge                 text not null default '',
  experience                text not null default '',
  -- Reg 11Q(4): the three behaviours the law spells out.
  behaviour_compliance      text not null default '',  -- refusing non-compliant work
  behaviour_cooperation     text not null default '',  -- cooperating with others
  behaviour_limits          text not null default '',  -- refusing work beyond competence
  -- Firms: organisational capability.
  organisational_capability text not null default '',
  -- Higher-risk projects only (reg 11E(2)): serious sanctions in last 5 years.
  has_serious_sanctions     boolean,
  sanctions_details         text not null default '',
  content_sha256            text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  submitted_at              timestamptz,
  unique (user_id, version)
);

create unique index competence_statements_one_draft
  on public.competence_statements (user_id) where status = 'draft';

alter table public.checklist_items
  add column competence_statement_id uuid references public.competence_statements (id);

create table public.documents (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users (id),
  -- Set for files uploaded to a project item (e.g. building information).
  project_id        uuid references public.projects (id) on delete cascade,
  checklist_item_id uuid references public.checklist_items (id) on delete cascade,
  kind              text not null check (kind in ('competence_evidence', 'item_upload')),
  storage_path      text not null unique,
  file_name         text not null,
  mime_type         text not null,
  size_bytes        bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  sha256            text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  created_at        timestamptz not null default now(),
  withdrawn_at      timestamptz,
  withdrawn_reason  text,
  constraint documents_item_upload_has_item check (kind <> 'item_upload' or checklist_item_id is not null)
);

create index documents_owner_idx on public.documents (owner_id);
create index documents_item_idx on public.documents (checklist_item_id);

-- Which evidence files belong to which version of a competence statement.
create table public.competence_evidence (
  statement_id uuid not null references public.competence_statements (id) on delete cascade,
  document_id  uuid not null references public.documents (id),
  primary key (statement_id, document_id)
);

alter table public.signatures enable row level security;
alter table public.competence_statements enable row level security;
alter table public.documents enable row level security;
alter table public.competence_evidence enable row level security;

-- Private bucket: PDF, images, Word and Excel, up to 20 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence', 'evidence', false, 20971520,
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
);

-------------------------------------------------------------------------------
-- Read-access helpers (used inside policies)
-------------------------------------------------------------------------------

-- True when a submitted statement is linked to an item on a project the
-- caller owns.
create function public.owns_project_using_statement(p_statement_id uuid)
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
      and public.is_project_owner(i.project_id)
  );
$$;

create function public.can_read_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1 from public.documents d
    where d.id = p_document_id
      and (
        d.owner_id = auth.uid()
        or (d.project_id is not null and public.is_project_member(d.project_id))
        or exists (
          select 1 from public.competence_evidence ce
          where ce.document_id = d.id and public.owns_project_using_statement(ce.statement_id)
        )
      )
  );
$$;

create function public.can_read_storage_path(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
    where d.storage_path = p_path and public.can_read_document(d.id)
  );
$$;

-------------------------------------------------------------------------------
-- Internal: fetch one of the caller's own, active checklist items
-------------------------------------------------------------------------------

create function public.assert_my_item(p_item_id uuid)
returns public.checklist_items
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_item public.checklist_items;
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;

  select i.* into v_item
  from public.checklist_items i
  join public.project_members m on m.id = i.member_id
  where i.id = p_item_id and m.user_id = auth.uid() and m.removed_at is null;

  if not found then
    raise exception 'This task is not yours';
  end if;
  if v_item.withdrawn_at is not null then
    raise exception 'This task no longer applies';
  end if;
  return v_item;
end;
$$;

-------------------------------------------------------------------------------
-- Acknowledgements: typed-name signature
-------------------------------------------------------------------------------

create function public.normalise_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'));
$$;

create function public.sign_acknowledgement(p_item_id uuid, p_typed_name text, p_user_agent text default null)
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

  v_statement := format(
    'I confirm I have read and understood this duty and will comply with it. %s (%s). %s [%s v%s]',
    v_template.title, v_template.legal_reference, v_template.explanation, v_template.code, v_template.version
  );
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
-- Simple form items (programme note, notification, matrix…)
-------------------------------------------------------------------------------

create function public.assert_simple_form(v_item public.checklist_items)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.duty_templates t where t.id = v_item.template_id and t.item_type = 'form')
     or v_item.template_code = 'ALL-11F-COMPETENCE' then
    raise exception 'This task is not a simple form';
  end if;
  if v_item.status = 'complete' then
    raise exception 'This task is already complete';
  end if;
end;
$$;

create function public.save_item_answer(p_item_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.checklist_items := public.assert_my_item(p_item_id);
begin
  perform public.assert_simple_form(v_item);

  update public.checklist_items
  set answer = jsonb_build_object('text', coalesce(p_text, '')),
      status = case when status = 'not_started' then 'in_progress'::public.item_status else status end,
      updated_at = now()
  where id = v_item.id;

  perform public.write_project_audit(v_item.project_id, 'item.saved', 'checklist_item', v_item.id::text,
    jsonb_build_object('code', v_item.template_code, 'length', length(coalesce(p_text, ''))));
end;
$$;

create function public.complete_form_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.checklist_items := public.assert_my_item(p_item_id);
begin
  perform public.assert_simple_form(v_item);
  if length(trim(coalesce(v_item.answer ->> 'text', ''))) = 0 then
    raise exception 'Fill in the form before marking it complete';
  end if;

  update public.checklist_items
  set status = 'complete', completed_at = now(), updated_at = now()
  where id = v_item.id;

  perform public.write_project_audit(v_item.project_id, 'item.completed', 'checklist_item', v_item.id::text,
    jsonb_build_object('code', v_item.template_code, 'answer_sha256', public.sha256_hex(v_item.answer ->> 'text')));
end;
$$;

-------------------------------------------------------------------------------
-- Competence statements
-------------------------------------------------------------------------------

-- Returns the caller's draft, creating one (copied from their latest
-- submitted version, evidence included) if needed.
create function public.start_competence_draft()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_draft  uuid;
  v_latest public.competence_statements;
begin
  if v_uid is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;

  select id into v_draft from public.competence_statements where user_id = v_uid and status = 'draft';
  if found then
    return v_draft;
  end if;

  select * into v_latest from public.competence_statements
  where user_id = v_uid and status = 'submitted'
  order by version desc limit 1;

  insert into public.competence_statements (
    user_id, version, skills, knowledge, experience, behaviour_compliance, behaviour_cooperation,
    behaviour_limits, organisational_capability, has_serious_sanctions, sanctions_details
  ) values (
    v_uid, coalesce(v_latest.version, 0) + 1,
    coalesce(v_latest.skills, ''), coalesce(v_latest.knowledge, ''), coalesce(v_latest.experience, ''),
    coalesce(v_latest.behaviour_compliance, ''), coalesce(v_latest.behaviour_cooperation, ''),
    coalesce(v_latest.behaviour_limits, ''), coalesce(v_latest.organisational_capability, ''),
    v_latest.has_serious_sanctions, coalesce(v_latest.sanctions_details, '')
  ) returning id into v_draft;

  if v_latest.id is not null then
    insert into public.competence_evidence (statement_id, document_id)
    select v_draft, ce.document_id
    from public.competence_evidence ce
    join public.documents d on d.id = ce.document_id
    where ce.statement_id = v_latest.id and d.withdrawn_at is null;
  end if;

  perform public.write_audit('competence.draft_created', 'competence_statement', v_draft::text,
    jsonb_build_object('version', coalesce(v_latest.version, 0) + 1));
  return v_draft;
end;
$$;

create function public.competence_statements_on_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changed text[];
begin
  if old.status = 'submitted' then
    raise exception 'A submitted competence statement cannot be changed; start a new version instead';
  end if;
  new.updated_at := now();

  -- Record which parts changed, not the personal content itself.
  select coalesce(array_agg(n.key order by n.key), '{}') into v_changed
  from jsonb_each(to_jsonb(new)) n
  join jsonb_each(to_jsonb(old)) o using (key)
  where n.value is distinct from o.value and n.key not in ('updated_at');

  if cardinality(v_changed) > 0 then
    perform public.write_audit(
      case when new.status = 'submitted' then 'competence.submitted' else 'competence.saved' end,
      'competence_statement', new.id::text,
      jsonb_build_object('version', new.version, 'fields', v_changed, 'content_sha256', new.content_sha256));
  end if;
  return new;
end;
$$;

create trigger competence_statements_before_update
  before update on public.competence_statements
  for each row execute function public.competence_statements_on_update();

create trigger competence_statements_no_delete
  before delete on public.competence_statements
  for each row execute function public.block_changes();

-- Submit (or reuse) the caller's competence statement for one project item.
-- If they have a draft, it is checked, frozen and linked. If not, their
-- latest submitted version is linked (the "competence passport").
create function public.submit_competence(p_item_id uuid)
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

  perform public.write_project_audit(v_item.project_id, 'item.submitted', 'checklist_item', v_item.id::text,
    jsonb_build_object('code', v_item.template_code, 'competence_statement_id', v_statement.id,
                       'version', v_statement.version));
  return v_statement.id;
end;
$$;

-------------------------------------------------------------------------------
-- Documents (uploads)
-------------------------------------------------------------------------------

-- Record a file the caller has just uploaded to their own storage folder.
-- p_item_id null = evidence for their competence statement draft.
create function public.register_document(
  p_storage_path text,
  p_file_name    text,
  p_mime_type    text,
  p_size_bytes   bigint,
  p_sha256       text,
  p_item_id      uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_item  public.checklist_items;
  v_draft uuid;
  v_doc   uuid;
begin
  if v_uid is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  if split_part(p_storage_path, '/', 1) <> v_uid::text then
    raise exception 'Files must be uploaded to your own folder';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'evidence' and name = p_storage_path and owner_id = v_uid::text
  ) then
    raise exception 'Upload not found';
  end if;

  if p_item_id is null then
    v_draft := public.start_competence_draft();
    insert into public.documents (owner_id, kind, storage_path, file_name, mime_type, size_bytes, sha256)
    values (v_uid, 'competence_evidence', p_storage_path, p_file_name, p_mime_type, p_size_bytes, lower(p_sha256))
    returning id into v_doc;
    insert into public.competence_evidence (statement_id, document_id) values (v_draft, v_doc);
    perform public.write_audit('document.uploaded', 'document', v_doc::text,
      jsonb_build_object('kind', 'competence_evidence', 'file_name', p_file_name, 'size_bytes', p_size_bytes,
                         'sha256', lower(p_sha256), 'competence_statement_id', v_draft));
  else
    v_item := public.assert_my_item(p_item_id);
    if not exists (select 1 from public.duty_templates t where t.id = v_item.template_id and t.item_type = 'upload') then
      raise exception 'This task does not take uploads';
    end if;
    if v_item.status = 'complete' then
      raise exception 'This task is already complete';
    end if;
    insert into public.documents (owner_id, project_id, checklist_item_id, kind, storage_path, file_name,
                                  mime_type, size_bytes, sha256)
    values (v_uid, v_item.project_id, v_item.id, 'item_upload', p_storage_path, p_file_name, p_mime_type,
            p_size_bytes, lower(p_sha256))
    returning id into v_doc;
    update public.checklist_items
    set status = case when status = 'not_started' then 'in_progress'::public.item_status else status end,
        updated_at = now()
    where id = v_item.id;
    perform public.write_project_audit(v_item.project_id, 'document.uploaded', 'document', v_doc::text,
      jsonb_build_object('kind', 'item_upload', 'code', v_item.template_code, 'file_name', p_file_name,
                         'size_bytes', p_size_bytes, 'sha256', lower(p_sha256)));
  end if;
  return v_doc;
end;
$$;

-- Files are never deleted. Withdrawing hides a file from drafts and open
-- items, keeping it (and the reason) on record.
create function public.withdraw_document(p_document_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.documents;
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  select * into v_doc from public.documents where id = p_document_id and owner_id = auth.uid();
  if not found then
    raise exception 'File not found';
  end if;
  if v_doc.withdrawn_at is not null then
    raise exception 'This file has already been withdrawn';
  end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Give a reason for withdrawing the file';
  end if;
  if exists (
    select 1 from public.checklist_items i
    where i.id = v_doc.checklist_item_id and i.status = 'complete'
  ) then
    raise exception 'This task is complete, so its files are part of the record';
  end if;

  update public.documents
  set withdrawn_at = now(), withdrawn_reason = trim(p_reason)
  where id = v_doc.id;

  -- Unlink from the draft only; submitted versions keep their evidence.
  delete from public.competence_evidence ce
  using public.competence_statements s
  where ce.document_id = v_doc.id and s.id = ce.statement_id and s.status = 'draft';

  perform public.write_project_audit(v_doc.project_id, 'document.withdrawn', 'document', v_doc.id::text,
    jsonb_build_object('reason', trim(p_reason), 'sha256', v_doc.sha256));
end;
$$;

create trigger documents_no_delete
  before delete on public.documents
  for each row execute function public.block_changes();

create function public.complete_upload_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.checklist_items := public.assert_my_item(p_item_id);
begin
  if not exists (select 1 from public.duty_templates t where t.id = v_item.template_id and t.item_type = 'upload') then
    raise exception 'This task does not take uploads';
  end if;
  if not exists (
    select 1 from public.documents d where d.checklist_item_id = v_item.id and d.withdrawn_at is null
  ) then
    raise exception 'Upload at least one file first';
  end if;

  update public.checklist_items
  set status = 'complete', completed_at = now(), updated_at = now()
  where id = v_item.id;

  perform public.write_project_audit(v_item.project_id, 'item.completed', 'checklist_item', v_item.id::text,
    jsonb_build_object('code', v_item.template_code));
end;
$$;

-------------------------------------------------------------------------------
-- Invites from the project page
-------------------------------------------------------------------------------

-- Owner invites a team member who has no account yet. Cancels any earlier
-- unused invite for that email and returns the new single-use token, which
-- the server emails (or shows for copying) and never stores.
create function public.invite_project_member(p_member_id uuid)
returns table (token text, email text, project_id uuid, project_name text, owner_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.project_members;
begin
  select * into v_member from public.project_members where id = p_member_id and removed_at is null;
  if not found or not public.is_project_owner(v_member.project_id) then
    raise exception 'Only the project owner can invite team members';
  end if;
  if v_member.user_id is not null then
    raise exception 'This person already has an account';
  end if;

  update public.invites
  set expires_at = now()
  where lower(invites.email) = v_member.email and used_at is null and expires_at > now();

  token := public.create_invite(v_member.email);

  update public.project_members set invited_at = now() where id = v_member.id;

  perform public.write_project_audit(v_member.project_id, 'member.invited', 'project_member', v_member.id::text,
    jsonb_build_object('email', v_member.email));

  email := v_member.email;
  project_id := v_member.project_id;
  select p.name into project_name from public.projects p where p.id = v_member.project_id;
  select coalesce(nullif(pr.full_name, ''), 'The project owner') into owner_name
  from public.profiles pr where pr.id = auth.uid();
  return next;
end;
$$;

-- Records whether the invite email went out.
create function public.record_invite_email(p_member_id uuid, p_sent boolean, p_detail text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
begin
  select m.project_id into v_project from public.project_members m where m.id = p_member_id;
  if v_project is null or not public.is_project_owner(v_project) then
    raise exception 'Only the project owner can do this';
  end if;
  perform public.write_project_audit(v_project,
    case when p_sent then 'invite.email_sent' else 'invite.email_failed' end,
    'project_member', p_member_id::text, jsonb_build_object('detail', left(p_detail, 500)));
end;
$$;

-------------------------------------------------------------------------------
-- Row Level Security policies
-------------------------------------------------------------------------------

create policy "Signers and project owners read signatures"
  on public.signatures for select to authenticated
  using (public.is_aal2() and (user_id = auth.uid() or public.is_project_owner(project_id)));

create policy "Users read their own competence statements"
  on public.competence_statements for select to authenticated
  using (public.is_aal2() and (user_id = auth.uid() or public.owns_project_using_statement(id)));

create policy "Users edit their own draft competence statement"
  on public.competence_statements for update to authenticated
  using (public.is_aal2() and user_id = auth.uid() and status = 'draft')
  with check (public.is_aal2() and user_id = auth.uid() and status = 'draft');

create policy "Readable documents"
  on public.documents for select to authenticated
  using (public.can_read_document(id));

create policy "Readable evidence links"
  on public.competence_evidence for select to authenticated
  using (public.can_read_document(document_id));

-- Storage: upload only into your own folder; read what you're allowed to.
-- There are no update or delete policies, so stored files can't be changed.
create policy "Upload evidence to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidence' and public.is_aal2()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Read permitted evidence"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'evidence' and public.is_aal2()
    and ((storage.foldername(name))[1] = auth.uid()::text or public.can_read_storage_path(name))
  );

-------------------------------------------------------------------------------
-- Permissions
-------------------------------------------------------------------------------

revoke all on public.signatures, public.competence_statements, public.documents, public.competence_evidence
  from anon, authenticated;
grant select on public.signatures, public.competence_statements, public.documents, public.competence_evidence
  to authenticated;
grant update (skills, knowledge, experience, behaviour_compliance, behaviour_cooperation, behaviour_limits,
              organisational_capability, has_serious_sanctions, sanctions_details)
  on public.competence_statements to authenticated;

revoke execute on function
  public.block_changes(),
  public.owns_project_using_statement(uuid),
  public.can_read_document(uuid),
  public.can_read_storage_path(text),
  public.assert_my_item(uuid),
  public.normalise_name(text),
  public.sign_acknowledgement(uuid, text, text),
  public.assert_simple_form(public.checklist_items),
  public.save_item_answer(uuid, text),
  public.complete_form_item(uuid),
  public.start_competence_draft(),
  public.competence_statements_on_update(),
  public.submit_competence(uuid),
  public.register_document(text, text, text, bigint, text, uuid),
  public.withdraw_document(uuid, text),
  public.complete_upload_item(uuid),
  public.invite_project_member(uuid),
  public.record_invite_email(uuid, boolean, text)
from public, anon, authenticated;

-- Used inside policies.
grant execute on function
  public.owns_project_using_statement(uuid),
  public.can_read_document(uuid),
  public.can_read_storage_path(text)
to authenticated;

grant execute on function
  public.sign_acknowledgement(uuid, text, text),
  public.save_item_answer(uuid, text),
  public.complete_form_item(uuid),
  public.start_competence_draft(),
  public.submit_competence(uuid),
  public.register_document(text, text, text, bigint, text, uuid),
  public.withdraw_document(uuid, text),
  public.complete_upload_item(uuid),
  public.invite_project_member(uuid),
  public.record_invite_email(uuid, boolean, text)
to authenticated;
