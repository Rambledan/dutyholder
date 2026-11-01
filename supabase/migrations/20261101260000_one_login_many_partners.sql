-- One login, many partners.
--
-- A person has a single account but can work with several project owners
-- ("partners"), each of whom invites them. This migration:
--   * adds job title and professional memberships to the profile, so people
--     save their details once and they're used on every project;
--   * makes joining a project a choice: when an owner adds someone who
--     already has an account, they are NOT attached until they accept the
--     invitation (accept_invitation / decline_invitation). Someone signing
--     up through an owner's invite link joins that project automatically;
--   * lets people keep their competence statement up to date outside any
--     project (submit_competence_passport), to reuse on every project.
--
-- Security: until a person accepts, the owner can't see their profile or
-- competence (RLS already requires an active, linked membership). People
-- only ever see invitations addressed to their own sign-in email.

-------------------------------------------------------------------------------
-- Profile details
-------------------------------------------------------------------------------

-- "if not exists": a first attempt at this migration added these two
-- columns before stopping on an error, so they may already be there.
alter table public.profiles
  add column if not exists job_title   text not null default '',
  add column if not exists memberships text not null default '';  -- professional bodies, registration numbers

grant update (job_title, memberships) on public.profiles to authenticated;

create or replace function public.profiles_on_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  perform public.write_audit(
    'profile.updated', 'profile', new.id::text,
    jsonb_build_object(
      'before', jsonb_build_object('full_name', old.full_name, 'company', old.company, 'phone', old.phone,
                                   'job_title', old.job_title, 'memberships', old.memberships),
      'after',  jsonb_build_object('full_name', new.full_name, 'company', new.company, 'phone', new.phone,
                                   'job_title', new.job_title, 'memberships', new.memberships)
    )
  );
  return new;
end;
$$;

-------------------------------------------------------------------------------
-- Invitations you accept
-------------------------------------------------------------------------------

alter table public.project_members
  add column accepted_at timestamptz,
  add column declined_at timestamptz;

update public.project_members set accepted_at = created_at where user_id is not null and accepted_at is null;

-- Which membership an invite link was sent for.
alter table public.invites
  add column member_id uuid references public.project_members (id) on delete set null;

-- Adding someone no longer attaches an existing account straight away.
create or replace function public.add_project_member(
  p_project_id   uuid,
  p_email        text,
  p_display_name text,
  p_role         public.dutyholder_role,
  p_discipline   text,
  p_is_firm      boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email  text := lower(trim(p_email));
  v_member uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'Only the project owner can add team members';
  end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email address is required';
  end if;
  if p_role is null then
    raise exception 'Choose a role';
  end if;

  insert into public.project_members (project_id, user_id, email, display_name, role, discipline, is_firm, added_by)
  values (p_project_id, null, v_email, coalesce(trim(p_display_name), ''), p_role,
          nullif(p_discipline, ''), coalesce(p_is_firm, false), auth.uid())
  returning id into v_member;

  return v_member;
exception when unique_violation then
  raise exception 'That person already has this role on the project';
end;
$$;

-- Invite: a new person gets a sign-up link; someone with an account gets an
-- invitation to accept (no link needed, they just sign in).
drop function public.invite_project_member(uuid);
create function public.invite_project_member(p_member_id uuid)
returns table (token text, email text, project_id uuid, project_name text, owner_name text, owner_company text,
               existing_account boolean)
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
    raise exception 'This person has already joined the project';
  end if;

  existing_account := exists (select 1 from auth.users u where lower(u.email) = v_member.email);

  if existing_account then
    token := null;
  else
    update public.invites
    set expires_at = now()
    where lower(invites.email) = v_member.email and used_at is null and expires_at > now();
    token := public.create_invite(v_member.email);
    update public.invites set member_id = v_member.id where token_hash = public.sha256_hex(token);
  end if;

  update public.project_members set invited_at = now(), declined_at = null where id = v_member.id;

  perform public.write_project_audit(v_member.project_id, 'member.invited', 'project_member', v_member.id::text,
    jsonb_build_object('email', v_member.email, 'existing_account', existing_account));

  email := v_member.email;
  project_id := v_member.project_id;
  select p.name into project_name from public.projects p where p.id = v_member.project_id;
  select coalesce(nullif(pr.full_name, ''), 'The project owner'), coalesce(pr.company, '')
  into owner_name, owner_company
  from public.profiles pr where pr.id = auth.uid();
  return next;
end;
$$;

-- On sign-up, join only the project whose invite link was used. Places on
-- other owners' projects wait as invitations to accept.
create or replace function public.link_pending_memberships()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.project_members m
  set user_id = new.id, accepted_at = now()
  from public.invites i
  where i.used_by = new.id
    and i.member_id is not null
    and m.project_id = (select project_id from public.project_members where id = i.member_id)
    and m.email = lower(new.email)
    and m.user_id is null and m.removed_at is null;
  return new;
end;
$$;

-- The caller's open invitations: places on projects, addressed to their
-- sign-in email, that they haven't accepted or declined.
create function public.my_invitations()
returns table (member_id uuid, project_id uuid, project_name text, project_address text, role public.dutyholder_role,
               invited_at timestamptz, owner_name text, owner_company text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, p.id, p.name, p.address, m.role, coalesce(m.invited_at, m.created_at),
         coalesce(nullif(op.full_name, ''), nullif(o.display_name, ''), o.email), coalesce(op.company, '')
  from public.project_members m
  join public.projects p on p.id = m.project_id and not p.is_demo
  left join lateral (
    select * from public.project_members x where x.project_id = m.project_id and x.is_owner and x.removed_at is null
    order by x.created_at limit 1
  ) o on true
  left join public.profiles op on op.id = o.user_id
  where public.is_aal2()
    and m.email = (select lower(email) from auth.users where id = auth.uid())
    and m.user_id is null and m.removed_at is null and m.declined_at is null
  order by coalesce(m.invited_at, m.created_at) desc;
$$;

-- Accept: join every role you've been given on that project.
create function public.accept_invitation(p_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email   text;
  v_member  public.project_members;
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  select * into v_member from public.project_members
  where id = p_member_id and email = v_email and user_id is null and removed_at is null;
  if not found then
    raise exception 'Invitation not found';
  end if;

  update public.project_members
  set user_id = auth.uid(), accepted_at = now(), declined_at = null
  where project_id = v_member.project_id and email = v_email and user_id is null and removed_at is null;

  perform public.write_project_audit(v_member.project_id, 'member.accepted', 'project_member', v_member.id::text, '{}'::jsonb);
  return v_member.project_id;
end;
$$;

create function public.decline_invitation(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email  text;
  v_member public.project_members;
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  select * into v_member from public.project_members
  where id = p_member_id and email = v_email and user_id is null and removed_at is null;
  if not found then
    raise exception 'Invitation not found';
  end if;

  update public.project_members
  set declined_at = now()
  where project_id = v_member.project_id and email = v_email and user_id is null and removed_at is null;

  perform public.write_project_audit(v_member.project_id, 'member.declined', 'project_member', v_member.id::text, '{}'::jsonb);
end;
$$;

-- Owners of the projects the caller has joined: the "partners" they work with.
create function public.my_partners()
returns table (project_id uuid, project_name text, owner_name text, owner_company text, owner_email text,
               my_roles text[], accepted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name,
         coalesce(nullif(op.full_name, ''), nullif(o.display_name, ''), o.email), coalesce(op.company, ''), o.email,
         array_agg(coalesce(me.role::text, 'owner') order by me.created_at), min(me.accepted_at)
  from public.project_members me
  join public.projects p on p.id = me.project_id and not p.is_demo
  left join lateral (
    select * from public.project_members x where x.project_id = me.project_id and x.is_owner and x.removed_at is null
    order by x.created_at limit 1
  ) o on true
  left join public.profiles op on op.id = o.user_id
  where public.is_aal2() and me.user_id = auth.uid() and me.removed_at is null
  group by p.id, p.name, op.full_name, o.display_name, o.email, op.company;
$$;

-------------------------------------------------------------------------------
-- Competence passport: keep your statement current outside any project
-------------------------------------------------------------------------------

create function public.submit_competence_passport()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_statement public.competence_statements;
  v_sha       text;
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  select * into v_statement from public.competence_statements where user_id = auth.uid() and status = 'draft';
  if not found then
    raise exception 'There are no changes to save';
  end if;
  if trim(v_statement.skills) = '' or trim(v_statement.knowledge) = '' or trim(v_statement.experience) = ''
     or trim(v_statement.behaviour_compliance) = '' or trim(v_statement.behaviour_cooperation) = ''
     or trim(v_statement.behaviour_limits) = '' then
    raise exception 'Answer every question before saving';
  end if;

  v_sha := public.sha256_hex(
    jsonb_build_object(
      'skills', v_statement.skills, 'knowledge', v_statement.knowledge, 'experience', v_statement.experience,
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
  return v_statement.id;
end;
$$;

-------------------------------------------------------------------------------
-- The chasing job leaves people alone until they've accepted
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
        'construction_start_date', p.construction_start_date))
      from public.projects p where p.status in ('setup', 'active') and not p.is_demo), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'project_id', m.project_id, 'email', m.email, 'user_id', m.user_id,
        'name', coalesce(nullif(pr.full_name, ''), nullif(m.display_name, ''), m.email),
        'role', m.role, 'is_owner', m.is_owner, 'chasing_paused', m.chasing_paused,
        'invited_at', m.invited_at, 'started_at', coalesce(m.invited_at, m.created_at)))
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
        'status', i.status, 'title', t.title, 'item_type', t.item_type, 'due_date', i.due_date))
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


revoke execute on function
  public.invite_project_member(uuid),
  public.my_invitations(),
  public.accept_invitation(uuid),
  public.decline_invitation(uuid),
  public.my_partners(),
  public.submit_competence_passport()
from public, anon, authenticated;

grant execute on function
  public.invite_project_member(uuid),
  public.my_invitations(),
  public.accept_invitation(uuid),
  public.decline_invitation(uuid),
  public.my_partners(),
  public.submit_competence_passport()
to authenticated;
