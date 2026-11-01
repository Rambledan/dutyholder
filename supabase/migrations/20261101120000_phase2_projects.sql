-- Phase 2: projects, team members, duty templates and the checklist engine.
--
-- Security model (all policies require two-factor, aal2):
--   * projects: members can read; the owner can edit set-up answers.
--   * project_members: members can see the whole team; only the owner adds
--     people (through add_project_member) or changes them.
--   * duty_templates: the master list of legal duties. It belongs to no
--     project, so any signed-in user who has passed 2FA can read it.
--   * checklist_items: you see your own items; the owner sees everyone's.
--     Nobody writes them directly; generate_checklist() maintains them.
--   * profiles: teammates can now see each other's names.
--   * audit_log: the owner can read their project's entries.

-------------------------------------------------------------------------------
-- Fixed lists
-------------------------------------------------------------------------------

-- The statutory dutyholder roles in Part 2A.
create type public.dutyholder_role as enum (
  'client', 'principal_designer', 'designer', 'principal_contractor', 'contractor'
);

create type public.jurisdiction as enum ('england', 'wales');

create type public.project_status as enum ('setup', 'active', 'complete', 'archived');

create type public.item_type as enum ('acknowledge', 'upload', 'form', 'sign', 'review');

-- Drives the red/amber/green grid: red = not_started or needs_info,
-- amber = in_progress or submitted, green = complete.
create type public.item_status as enum ('not_started', 'in_progress', 'submitted', 'needs_info', 'complete');

-------------------------------------------------------------------------------
-- Tables
-------------------------------------------------------------------------------

create table public.projects (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null check (length(trim(name)) > 0),
  address                     text not null default '',
  description                 text not null default '',
  jurisdiction                public.jurisdiction not null default 'england',
  is_domestic_client          boolean not null default false,
  -- 11C: a domestic client may agree in writing that the principal designer
  -- carries out the client's duties (otherwise the contractor side does).
  domestic_duties_to_pd       boolean not null default false,
  is_higher_risk              boolean not null default false,
  expected_contractors        integer not null default 2 check (expected_contractors >= 1),
  -- 11D(2): client certifies the CDM 2015 principal designer is also the
  -- Building Regulations principal designer.
  cdm_pd_certified            boolean not null default false,
  retention_years             integer not null default 15 check (retention_years between 1 and 50),
  status                      public.project_status not null default 'setup',
  created_by                  uuid references auth.users (id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  -- v1 is England only and refuses higher-risk building work.
  constraint projects_england_only check (jurisdiction = 'england'),
  constraint projects_no_higher_risk check (not is_higher_risk)
);

create table public.project_members (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  -- Null until the person has an account; linked by email.
  user_id         uuid references auth.users (id) on delete set null,
  email           text not null check (email = lower(trim(email))),
  display_name    text not null default '',
  -- Null for an owner who holds no statutory role on this project.
  role            public.dutyholder_role,
  discipline      text check (discipline in ('architecture', 'structural', 'fire', 'mep', 'civil', 'other')),
  is_firm         boolean not null default false,
  is_owner        boolean not null default false,
  chasing_paused  boolean not null default false,
  added_by        uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  removed_at      timestamptz,
  constraint project_members_owner_or_role check (is_owner or role is not null)
);

-- One person can hold several roles on a project, but each role only once.
create unique index project_members_unique_role
  on public.project_members (project_id, email, role)
  where removed_at is null;
create index project_members_user_idx on public.project_members (user_id) where removed_at is null;
create index project_members_email_idx on public.project_members (email);

create table public.duty_templates (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null,              -- e.g. 'PD-11M-1'
  version               integer not null default 1,
  -- Which roles receive this item.
  roles                 public.dutyholder_role[] not null check (cardinality(roles) > 0),
  title                 text not null,
  explanation           text not null,              -- plain English
  legal_reference       text not null,              -- e.g. 'Reg 11M(1)-(4)'
  legislation_url       text,
  item_type             public.item_type not null,
  -- Keys understood by generate_checklist():
  --   multiple_contractors, domestic_client, cdm_pd_certified, member_is_firm
  conditions            jsonb not null default '{}'::jsonb,
  -- For client duties when the client is domestic (11C): who takes it over.
  -- Null means the default, the principal contractor.
  domestic_transfer_to  public.dutyholder_role,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  superseded_at         timestamptz,
  unique (code, version)
);

-- Only one current version of each duty.
create unique index duty_templates_current_code on public.duty_templates (code) where superseded_at is null;

create table public.checklist_items (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  member_id       uuid not null references public.project_members (id) on delete cascade,
  template_id     uuid not null references public.duty_templates (id),
  template_code   text not null,
  status          public.item_status not null default 'not_started',
  due_date        date,
  completed_at    timestamptz,
  answer          jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Set when a set-up change means the item no longer applies. Items are
  -- never deleted, so the history stays complete.
  withdrawn_at    timestamptz,
  unique (member_id, template_code)
);

create index checklist_items_project_idx on public.checklist_items (project_id);

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.duty_templates enable row level security;
alter table public.checklist_items enable row level security;

-------------------------------------------------------------------------------
-- Membership helpers (used inside policies)
-------------------------------------------------------------------------------

-- SECURITY DEFINER so policies on project_members can use them without
-- looping back into project_members' own policies.
create function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid() and removed_at is null
  );
$$;

create function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid() and is_owner and removed_at is null
  );
$$;

-- True when the caller and p_user_id are both active on at least one project.
create function public.shares_project_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1
    from public.project_members me
    join public.project_members them on them.project_id = me.project_id
    where me.user_id = auth.uid() and me.removed_at is null
      and them.user_id = p_user_id and them.removed_at is null
  );
$$;

-------------------------------------------------------------------------------
-- Audit helper with a project
-------------------------------------------------------------------------------

create function public.write_project_audit(
  p_project_id  uuid,
  p_action      text,
  p_entity_type text,
  p_entity_id   text,
  p_details     jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, project_id, details, ip_address)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_project_id,
          coalesce(p_details, '{}'::jsonb), public.request_ip());
$$;

-------------------------------------------------------------------------------
-- The checklist engine
-------------------------------------------------------------------------------

-- Which duties each active member of a project should have right now.
create function public.checklist_wanted(p_project_id uuid)
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
         or (t.conditions ->> 'member_is_firm')::boolean = m.is_firm);
$$;

-- Brings a project's checklist in line with checklist_wanted(): adds missing
-- items, withdraws ones that no longer apply and restores ones that apply
-- again. Safe to run any number of times. Triggers below re-run it whenever
-- a member or a set-up answer changes.
create function public.generate_checklist(p_project_id uuid)
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
end;
$$;

-------------------------------------------------------------------------------
-- Creating projects and adding members
-------------------------------------------------------------------------------

create function public.create_project(
  p_name                  text,
  p_address               text,
  p_description           text,
  p_is_domestic_client    boolean,
  p_domestic_duties_to_pd boolean,
  p_is_higher_risk        boolean,
  p_expected_contractors  integer,
  p_cdm_pd_certified      boolean,
  p_owner_role            public.dutyholder_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_email   text;
  v_name    text;
  v_project uuid;
begin
  if v_uid is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  if p_is_higher_risk then
    raise exception 'Higher-risk building work is not supported in this version';
  end if;

  select lower(email) into v_email from auth.users where id = v_uid;
  select full_name into v_name from public.profiles where id = v_uid;

  insert into public.projects (
    name, address, description, is_domestic_client, domestic_duties_to_pd,
    is_higher_risk, expected_contractors, cdm_pd_certified, created_by
  ) values (
    trim(p_name), coalesce(trim(p_address), ''), coalesce(trim(p_description), ''),
    p_is_domestic_client, p_is_domestic_client and p_domestic_duties_to_pd,
    p_is_higher_risk, p_expected_contractors, p_cdm_pd_certified, v_uid
  ) returning id into v_project;

  perform public.write_project_audit(v_project, 'project.created', 'project', v_project::text,
    jsonb_build_object('name', trim(p_name), 'is_domestic_client', p_is_domestic_client,
                       'expected_contractors', p_expected_contractors,
                       'cdm_pd_certified', p_cdm_pd_certified));

  insert into public.project_members (project_id, user_id, email, display_name, role, is_owner, added_by)
  values (v_project, v_uid, v_email, coalesce(v_name, ''), p_owner_role, true, v_uid);

  return v_project;
end;
$$;

-- Owner adds someone by email. Links to their account if they already have one.
create function public.add_project_member(
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
  v_user   uuid;
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

  select id into v_user from auth.users where lower(email) = v_email;

  insert into public.project_members (project_id, user_id, email, display_name, role, discipline, is_firm, added_by)
  values (p_project_id, v_user, v_email, coalesce(trim(p_display_name), ''), p_role,
          nullif(p_discipline, ''), coalesce(p_is_firm, false), auth.uid())
  returning id into v_member;

  return v_member;
exception when unique_violation then
  raise exception 'That person already has this role on the project';
end;
$$;

-------------------------------------------------------------------------------
-- Triggers: audit, keep checklists current, link new accounts
-------------------------------------------------------------------------------

create function public.projects_on_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  -- Keep the 11C written-agreement flag meaningful.
  if not new.is_domestic_client then
    new.domestic_duties_to_pd := false;
  end if;
  perform public.write_project_audit(new.id, 'project.updated', 'project', new.id::text,
    jsonb_build_object('before', to_jsonb(old) - 'updated_at', 'after', to_jsonb(new) - 'updated_at'));
  return new;
end;
$$;

create trigger projects_before_update
  before update on public.projects
  for each row execute function public.projects_on_update();

create function public.projects_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.generate_checklist(new.id);
  return null;
end;
$$;

create trigger projects_regenerate_checklist
  after update of is_domestic_client, domestic_duties_to_pd, expected_contractors, cdm_pd_certified
  on public.projects
  for each row execute function public.projects_after_update();

create function public.project_members_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.write_project_audit(
    new.project_id,
    case tg_op when 'INSERT' then 'member.added' else 'member.updated' end,
    'project_member', new.id::text,
    case tg_op when 'INSERT' then to_jsonb(new)
         else jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)) end
  );
  perform public.generate_checklist(new.project_id);
  return null;
end;
$$;

create trigger project_members_regenerate_checklist
  after insert or update on public.project_members
  for each row execute function public.project_members_after_change();

-- When someone signs up, link any project places waiting for their email.
-- Runs after on_auth_user_created (triggers fire in name order), which has
-- already checked their invite.
create function public.link_pending_memberships()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.project_members
  set user_id = new.id
  where email = lower(new.email) and user_id is null;
  return new;
end;
$$;

create trigger on_auth_user_created_link_members
  after insert on auth.users
  for each row execute function public.link_pending_memberships();

-- Templates are never edited in place: add a new version instead. The only
-- change allowed is marking a version superseded.
create function public.duty_templates_block_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and old.superseded_at is null and new.superseded_at is not null
     and (to_jsonb(new) - 'superseded_at') = (to_jsonb(old) - 'superseded_at') then
    return new;
  end if;
  raise exception 'duty_templates rows are never edited or deleted; add a new version instead';
end;
$$;

create trigger duty_templates_immutable
  before update or delete on public.duty_templates
  for each row execute function public.duty_templates_block_changes();

-------------------------------------------------------------------------------
-- Row Level Security policies
-------------------------------------------------------------------------------

create policy "Members read their projects"
  on public.projects for select to authenticated
  using (public.is_aal2() and public.is_project_member(id));

create policy "Owners update their projects"
  on public.projects for update to authenticated
  using (public.is_aal2() and public.is_project_owner(id))
  with check (public.is_aal2() and public.is_project_owner(id));

create policy "Members see their project team"
  on public.project_members for select to authenticated
  using (public.is_aal2() and public.is_project_member(project_id));

create policy "Owners update team members"
  on public.project_members for update to authenticated
  using (public.is_aal2() and public.is_project_owner(project_id))
  with check (public.is_aal2() and public.is_project_owner(project_id));

create policy "Signed-in users read duty templates"
  on public.duty_templates for select to authenticated
  using (public.is_aal2());

create policy "Members read their own items; owners read all"
  on public.checklist_items for select to authenticated
  using (
    public.is_aal2() and public.is_project_member(project_id) and (
      public.is_project_owner(project_id)
      or exists (select 1 from public.project_members m
                 where m.id = member_id and m.user_id = auth.uid() and m.removed_at is null)
    )
  );

create policy "Teammates read each other's profiles"
  on public.profiles for select to authenticated
  using (public.is_aal2() and public.shares_project_with(id));

create policy "Owners read their project's audit trail"
  on public.audit_log for select to authenticated
  using (public.is_aal2() and project_id is not null and public.is_project_owner(project_id));

-------------------------------------------------------------------------------
-- Table and function permissions
-------------------------------------------------------------------------------

revoke all on public.projects, public.project_members, public.duty_templates, public.checklist_items
  from anon, authenticated;

grant select on public.projects, public.project_members, public.duty_templates, public.checklist_items
  to authenticated;
-- Owners may change set-up answers and these member settings, nothing else.
grant update (name, address, description, is_domestic_client, domestic_duties_to_pd,
              expected_contractors, cdm_pd_certified, retention_years, status)
  on public.projects to authenticated;
grant update (display_name, discipline, is_firm, chasing_paused, removed_at)
  on public.project_members to authenticated;

grant select on public.audit_log to authenticated;

revoke execute on function
  public.is_project_member(uuid),
  public.is_project_owner(uuid),
  public.shares_project_with(uuid),
  public.write_project_audit(uuid, text, text, text, jsonb),
  public.checklist_wanted(uuid),
  public.generate_checklist(uuid),
  public.create_project(text, text, text, boolean, boolean, boolean, integer, boolean, public.dutyholder_role),
  public.add_project_member(uuid, text, text, public.dutyholder_role, text, boolean),
  public.projects_on_update(),
  public.projects_after_update(),
  public.project_members_after_change(),
  public.link_pending_memberships(),
  public.duty_templates_block_changes()
from public, anon, authenticated;

-- Used inside policies, so signed-in users must be able to run them.
grant execute on function
  public.is_project_member(uuid),
  public.is_project_owner(uuid),
  public.shares_project_with(uuid)
to authenticated;

grant execute on function
  public.create_project(text, text, text, boolean, boolean, boolean, integer, boolean, public.dutyholder_role),
  public.add_project_member(uuid, text, text, public.dutyholder_role, text, boolean)
to authenticated;
