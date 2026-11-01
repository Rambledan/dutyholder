-- Phase 5: the chasing engine and owner dashboard.
--
--   * projects.clock_offset_days: shifts the project's clock (projectNow).
--     0 for real projects; phase 6 demo projects fast-forward with it.
--   * projects.construction_start_date: named in the day-7 reminder.
--   * reminders: every chase, recorded BEFORE it is sent. The unique key on
--     (member_id, step_key) means a step can only ever happen once, so a
--     job that runs twice sends nothing twice.
--   * chase_state() / record_reminders(): the scheduled job's only way in.
--     Only the service role can call them (never a signed-in user).
--   * record_manual_chase(): the owner's "Chase now" button, once a day per
--     person.
--
-- Security model: reminders are readable by the project owner and by the
-- person chased; nobody writes them except through the functions above.

alter table public.projects
  add column clock_offset_days integer not null default 0 check (clock_offset_days between 0 and 3650),
  add column construction_start_date date;

grant update (construction_start_date) on public.projects to authenticated;

-- The project's "now": real time plus its clock offset. Mirrors
-- projectNow(project) in src/lib/clock.ts.
create function public.project_now(p_project_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select now() + make_interval(days => coalesce(
    (select clock_offset_days from public.projects where id = p_project_id), 0));
$$;

create table public.reminders (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  member_id       uuid not null references public.project_members (id) on delete cascade,
  recipient_email text not null,
  cc_emails       text[] not null default '{}',
  -- e.g. 'nudge_3', 'reminder_7', 'firm_14', 'firm_21', 'owner_digest_2026-W45', 'manual_2026-11-01'
  step_key        text not null,
  kind            text not null check (kind in ('nudge', 'reminder', 'firm', 'owner_digest', 'manual')),
  item_ids        uuid[] not null default '{}',
  project_day     date not null,          -- the project's own date when chased
  status          text not null default 'pending' check (status in ('pending', 'sent', 'not_sent', 'failed')),
  detail          text,
  simulated       boolean not null default false,  -- phase 6 demo outbox
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  unique (member_id, step_key)
);

create index reminders_project_idx on public.reminders (project_id, created_at desc);
create index reminders_member_idx on public.reminders (member_id, created_at desc);

alter table public.reminders enable row level security;

-- Only the delivery result may change after a reminder is recorded.
create function public.reminders_on_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.project_id, new.member_id, new.recipient_email, new.step_key, new.kind, new.project_day, new.item_ids)
     is distinct from
     (old.project_id, old.member_id, old.recipient_email, old.step_key, old.kind, old.project_day, old.item_ids) then
    raise exception 'A recorded reminder cannot be changed';
  end if;
  return new;
end;
$$;

create trigger reminders_frozen
  before update on public.reminders
  for each row execute function public.reminders_on_update();

create trigger reminders_no_delete
  before delete on public.reminders
  for each row execute function public.block_changes();

create policy "Owners and the person chased read reminders"
  on public.reminders for select to authenticated
  using (
    public.is_aal2() and (
      public.is_project_owner(project_id)
      or exists (select 1 from public.project_members m where m.id = member_id and m.user_id = auth.uid())
    )
  );

-------------------------------------------------------------------------------
-- For the scheduled job (service role only)
-------------------------------------------------------------------------------

-- Everything the planner needs, in one call: live projects, their active
-- members (with names), open checklist items, pending appointment
-- signatures, and the reminders already recorded.
create function public.chase_state()
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
      from public.projects p where p.status in ('setup', 'active')), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'project_id', m.project_id, 'email', m.email, 'user_id', m.user_id,
        'name', coalesce(nullif(pr.full_name, ''), nullif(m.display_name, ''), m.email),
        'role', m.role, 'is_owner', m.is_owner, 'chasing_paused', m.chasing_paused,
        'invited_at', m.invited_at, 'started_at', coalesce(m.invited_at, m.created_at)))
      from public.project_members m
      join public.projects p on p.id = m.project_id and p.status in ('setup', 'active')
      left join public.profiles pr on pr.id = m.user_id
      where m.removed_at is null), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'project_id', i.project_id, 'member_id', i.member_id, 'code', i.template_code,
        'status', i.status, 'title', t.title, 'item_type', t.item_type, 'due_date', i.due_date))
      from public.checklist_items i
      join public.duty_templates t on t.id = i.template_id
      join public.projects p on p.id = i.project_id and p.status in ('setup', 'active')
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

-- Claim a batch of planned reminders. Each is inserted only if that member
-- hasn't had that step before; returns the ones actually claimed, which are
-- the only ones the job may send.
create function public.claim_reminders(p_reminders jsonb)
returns setof public.reminders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_claimed public.reminders;
begin
  for v_row in select * from jsonb_array_elements(p_reminders)
  loop
    insert into public.reminders (project_id, member_id, recipient_email, cc_emails, step_key, kind, item_ids,
                                  project_day, simulated)
    values (
      (v_row ->> 'project_id')::uuid, (v_row ->> 'member_id')::uuid, v_row ->> 'recipient_email',
      coalesce(array(select jsonb_array_elements_text(v_row -> 'cc_emails')), '{}'),
      v_row ->> 'step_key', v_row ->> 'kind',
      coalesce(array(select jsonb_array_elements_text(v_row -> 'item_ids'))::uuid[], '{}'),
      (v_row ->> 'project_day')::date, coalesce((v_row ->> 'simulated')::boolean, false)
    )
    on conflict (member_id, step_key) do nothing
    returning * into v_claimed;

    if v_claimed.id is not null then
      return next v_claimed;
    end if;
    v_claimed := null;
  end loop;
end;
$$;

-- Record how delivery went, and write it to the audit trail.
create function public.finish_reminders(p_ids uuid[], p_status text, p_detail text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r public.reminders;
begin
  for v_r in
    update public.reminders
    set status = p_status, detail = left(p_detail, 500),
        sent_at = case when p_status = 'sent' then now() else sent_at end
    where id = any (p_ids)
    returning *
  loop
    insert into public.audit_log (actor_id, action, entity_type, entity_id, project_id, details)
    values (null,
            case when p_status = 'sent' then 'reminder.sent' else 'reminder.' || p_status end,
            'project_member', v_r.member_id::text, v_r.project_id,
            jsonb_build_object('reminder_id', v_r.id, 'step', v_r.step_key, 'to', v_r.recipient_email,
                               'cc', v_r.cc_emails, 'detail', left(p_detail, 500), 'simulated', v_r.simulated));
  end loop;
end;
$$;

-------------------------------------------------------------------------------
-- The owner's "Chase now" button
-------------------------------------------------------------------------------

-- Records a manual chase (at most one per person per project day) and
-- returns its id, or raises if already chased today.
create function public.record_manual_chase(p_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.project_members;
  v_day    date;
  v_id     uuid;
begin
  select * into v_member from public.project_members where id = p_member_id and removed_at is null;
  if not found or not public.is_project_owner(v_member.project_id) then
    raise exception 'Only the project owner can chase people';
  end if;
  v_day := (public.project_now(v_member.project_id) at time zone 'Europe/London')::date;

  insert into public.reminders (project_id, member_id, recipient_email, step_key, kind, project_day)
  values (v_member.project_id, v_member.id, v_member.email, 'manual_' || v_day, 'manual', v_day)
  on conflict (member_id, step_key) do nothing
  returning id into v_id;

  if v_id is null then
    raise exception 'Already chased today; try again tomorrow';
  end if;

  perform public.write_project_audit(v_member.project_id, 'reminder.manual', 'project_member', v_member.id::text,
    jsonb_build_object('reminder_id', v_id));
  return v_id;
end;
$$;

-- The owner's side of finish_reminders for a manual chase.
create function public.finish_manual_chase(p_reminder_id uuid, p_sent boolean, p_detail text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
begin
  select project_id into v_project from public.reminders where id = p_reminder_id and kind = 'manual';
  if v_project is null or not public.is_project_owner(v_project) then
    raise exception 'Only the project owner can do this';
  end if;
  perform public.finish_reminders(array[p_reminder_id], case when p_sent then 'sent' else 'not_sent' end, p_detail);
end;
$$;

-------------------------------------------------------------------------------
-- Permissions
-------------------------------------------------------------------------------

revoke all on public.reminders from anon, authenticated;
grant select on public.reminders to authenticated;

revoke execute on function
  public.project_now(uuid),
  public.reminders_on_update(),
  public.chase_state(),
  public.claim_reminders(jsonb),
  public.finish_reminders(uuid[], text, text),
  public.record_manual_chase(uuid),
  public.finish_manual_chase(uuid, boolean, text)
from public, anon, authenticated;

grant execute on function public.chase_state(), public.claim_reminders(jsonb),
  public.finish_reminders(uuid[], text, text) to service_role;
grant execute on function public.project_now(uuid) to authenticated, service_role;
grant execute on function public.record_manual_chase(uuid), public.finish_manual_chase(uuid, boolean, text)
  to authenticated;
