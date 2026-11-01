-- Phase 6: demo mode.
--
--   * A demo project (is_demo) is an ordinary project whose clock is
--     anchored: its "now" is demo_started_at + clock_offset_days, so every
--     simulated day is 10am on the next calendar day and the real chasing
--     rules (weekdays, one a day, the sequence) apply unchanged.
--   * Its people are fictional (no accounts) and carry a demo_persona that
--     the simulation scripts in src/lib/demo act out.
--   * Its reminders are recorded with simulated = true and the exact email
--     text, and shown in an in-app Outbox. The real scheduled job never sees
--     demo projects, so a fictional person can never be emailed.
--   * Only the demo's owner can advance it, and demo_step() only ever
--     touches demo projects and fictional members.

alter table public.projects
  add column is_demo boolean not null default false,
  add column demo_started_at timestamptz,
  -- Simulation memory: per-day history for the chart, and persona state.
  add column demo_state jsonb not null default '{}'::jsonb,
  add constraint projects_demo_anchor check (not is_demo or demo_started_at is not null);

alter table public.project_members
  add column demo_persona text;

-- Keep the email text with each reminder (the Outbox shows it).
alter table public.reminders
  add column subject text,
  add column body_text text;

-- Demo projects run on their own anchored clock. Mirrors projectNow().
create or replace function public.project_now(p_project_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.is_demo then p.demo_started_at else now() end
         + make_interval(days => p.clock_offset_days)
  from public.projects p where p.id = p_project_id;
$$;

-- The real chasing job ignores demo projects entirely.
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
      where m.removed_at is null), '[]'::jsonb),
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


-------------------------------------------------------------------------------
-- Creating a demo
-------------------------------------------------------------------------------

-- A ready-made demo project owned by the caller, with six fictional people
-- (the client, a principal designer, three engineers and a principal
-- contractor), all "invited" on day 0. Day 0 is 10am UK time on the next
-- weekday.
create function public.create_demo_project()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_email   text;
  v_name    text;
  v_start   timestamptz;
  v_project uuid;
  v_person  record;
begin
  if v_uid is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  select full_name into v_name from public.profiles where id = v_uid;

  -- Next weekday at 10:00 London time.
  v_start := ((now() at time zone 'Europe/London')::date + 1 + time '10:00') at time zone 'Europe/London';
  while extract(isodow from (v_start at time zone 'Europe/London')) > 5 loop
    v_start := v_start + interval '1 day';
  end loop;

  insert into public.projects (name, address, description, is_domestic_client, expected_contractors,
                               construction_start_date, created_by, is_demo, demo_started_at, status,
                               demo_state)
  values ('DEMO – Riverside Offices', '12 Riverside Walk (fictional)',
          'A fictional three-storey office refurbishment, used to demonstrate chasing in fast-forward.',
          false, 3, ((v_start at time zone 'Europe/London')::date + 42), v_uid, true, v_start, 'active',
          jsonb_build_object('history', jsonb_build_array()))
  returning id into v_project;

  -- The real user owns the demo but holds no statutory role in it.
  insert into public.project_members (project_id, user_id, email, display_name, role, is_owner, added_by)
  values (v_project, v_uid, v_email, coalesce(v_name, ''), null, true, v_uid);

  for v_person in
    select * from (values
      ('client',     'Chris Client',      'client',               null::text,      false),
      ('pd',         'Priya Patel',       'principal_designer',   'architecture',  true),
      ('structural', 'Sam Structures',    'designer',             'structural',    false),
      ('fire',       'Faye Fireside',     'designer',             'fire',          false),
      ('mep',        'Mo Mechanical',     'designer',             'mep',           false),
      ('pc',         'Bea Builders Ltd',  'principal_contractor', null::text,      true)
    ) as p(persona, name, role, discipline, is_firm)
  loop
    insert into public.project_members (project_id, email, display_name, role, discipline, is_firm,
                                        added_by, invited_at, demo_persona)
    values (v_project, v_person.persona || '.' || left(v_project::text, 8) || '@demo.invalid', v_person.name,
            v_person.role::public.dutyholder_role, v_person.discipline, v_person.is_firm, v_uid, v_start,
            v_person.persona);
  end loop;

  perform public.write_project_audit(v_project, 'demo.created', 'project', v_project::text, '{}'::jsonb);
  return v_project;
end;
$$;

-------------------------------------------------------------------------------
-- Advancing a demo by one simulated day
-------------------------------------------------------------------------------

-- One atomic step: move the clock on a day, apply the fictional people's
-- scripted status changes, record the day's simulated emails, and save the
-- simulation's memory. Everything is checked: owner only, demo projects
-- only, fictional members only, valid statuses only.
create function public.demo_step(
  p_project_id   uuid,
  p_expected_day integer,
  p_changes      jsonb,
  p_reminders    jsonb,
  p_state        jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects;
  v_change  jsonb;
  v_r       jsonb;
  v_updated integer;
begin
  select * into v_project from public.projects where id = p_project_id for update;
  if not found or not v_project.is_demo then
    raise exception 'Only demo projects can be advanced';
  end if;
  if not public.is_project_owner(p_project_id) then
    raise exception 'Only the demo''s owner can advance it';
  end if;
  -- Guards against two tabs advancing at once.
  if v_project.clock_offset_days + 1 <> p_expected_day then
    raise exception 'The demo has moved on; refresh and try again';
  end if;

  update public.projects
  set clock_offset_days = clock_offset_days + 1, demo_state = coalesce(p_state, '{}'::jsonb)
  where id = p_project_id;

  for v_change in select * from jsonb_array_elements(coalesce(p_changes, '[]'::jsonb))
  loop
    update public.checklist_items i
    set status = (v_change ->> 'status')::public.item_status,
        completed_at = case when v_change ->> 'status' = 'complete' then coalesce(i.completed_at, now()) else null end,
        updated_at = now()
    from public.project_members m
    where i.id = (v_change ->> 'item_id')::uuid
      and i.project_id = p_project_id
      and i.withdrawn_at is null
      and m.id = i.member_id
      and m.user_id is null
      and m.demo_persona is not null;
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'Demo can only change its fictional people''s tasks';
    end if;
  end loop;

  perform public.refresh_review_items(p_project_id);

  for v_r in select * from jsonb_array_elements(coalesce(p_reminders, '[]'::jsonb))
  loop
    if not exists (select 1 from public.project_members m
                   where m.id = (v_r ->> 'member_id')::uuid and m.project_id = p_project_id) then
      raise exception 'Reminder for someone outside the demo';
    end if;
    insert into public.reminders (project_id, member_id, recipient_email, cc_emails, step_key, kind, item_ids,
                                  project_day, status, simulated, sent_at, subject, body_text, detail)
    values (
      p_project_id, (v_r ->> 'member_id')::uuid, v_r ->> 'recipient_email',
      coalesce(array(select jsonb_array_elements_text(v_r -> 'cc_emails')), '{}'),
      v_r ->> 'step_key', v_r ->> 'kind',
      coalesce(array(select jsonb_array_elements_text(v_r -> 'item_ids'))::uuid[], '{}'),
      (v_r ->> 'project_day')::date, 'sent', true, now(), v_r ->> 'subject', v_r ->> 'body_text',
      'Simulated: shown in the demo Outbox, not emailed'
    )
    on conflict (member_id, step_key) do nothing;
  end loop;

  perform public.write_project_audit(p_project_id, 'demo.advanced', 'project', p_project_id::text,
    jsonb_build_object('day', p_expected_day, 'changes', jsonb_array_length(coalesce(p_changes, '[]'::jsonb)),
                       'emails', jsonb_array_length(coalesce(p_reminders, '[]'::jsonb))));
  return p_expected_day;
end;
$$;

revoke execute on function public.create_demo_project(), public.demo_step(uuid, integer, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_demo_project(), public.demo_step(uuid, integer, jsonb, jsonb, jsonb)
  to authenticated;
