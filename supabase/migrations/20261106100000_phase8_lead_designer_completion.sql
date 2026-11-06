-- Phase 8, follow-up: completion statements on one-contractor projects.
--
-- With only one contractor there are no principal appointments (11D(6)-(7)):
-- the designers agree in writing who is lead designer, and reg 16(4A) asks
-- for the statement from the "principal designer (or sole or lead
-- designer)". So on those projects PD-16-COMPLETION goes to the agreed lead
-- designer (whatever their role on the project) instead of to everyone with
-- the principal designer role, and their statement cites the agreement.

-- Version 2 of the principal designer's completion statement: only by role
-- where there is more than one contractor.
update public.duty_templates set superseded_at = now() where code = 'PD-16-COMPLETION' and version = 1;

insert into public.duty_templates
  (code, version, roles, title, explanation, legal_reference, legislation_url, item_type, conditions, domestic_transfer_to, sort_order)
values
  ('PD-16-COMPLETION', 2, '{principal_designer}',
   'Sign your completion statement',
   'Within 5 days of the building work being completed, the completion notice must include a statement signed by each principal designer (or, with one contractor, the lead designer), giving their appointment dates and confirming they fulfilled their duties under Part 2A.',
   'Reg 16(4A)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/16',
   'acknowledge', '{"multiple_contractors": true}', null, 640);

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
         or (t.conditions ->> 'early_occupation')::boolean = (p.occupation_date is not null))
  union
  -- With one contractor, the lead designer agreed in writing under 11D(7)
  -- signs the principal designer's completion statement (reg 16(4A)).
  select a.appointee_member_id, t.id, t.code
  from public.appointments a
  join public.project_members m on m.id = a.appointee_member_id and m.removed_at is null
  join public.duty_templates t on t.code = 'PD-16-COMPLETION' and t.superseded_at is null
  cross join p
  where a.project_id = p.id and a.kind = 'lead_designer_agreement' and a.status = 'signed'
    and p.expected_contractors = 1;
$$;


create or replace function public.completion_statement_text(p_item_id uuid)
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
    -- With one contractor, the lead designer agreed in writing (11D(7)).
    if v_kind = 'pd_appointment' and v_project.expected_contractors = 1 then
      select (a.completed_at at time zone 'Europe/London')::date into v_from
      from public.appointments a
      where a.project_id = v_project.id and a.kind = 'lead_designer_agreement' and a.appointee_member_id = v_member.id
        and a.status = 'signed'
      order by a.completed_at desc
      limit 1;
      if v_from is not null then
        return format(
          'Completion statement (Building Regulations 2010, regulation 16(4A)). Project: %s%s. '
          'I, %s, state that I was the lead designer for this project, agreed in writing under regulation 11D(7) on %s, '
          'until %s, and that I fulfilled the duties of the principal designer under Part 2A of the Building '
          'Regulations 2010. [%s v%s]',
          v_project.name, case when v_project.address <> '' then ', ' || v_project.address else '' end,
          v_name, public.long_date(v_from), v_until, v_template.code, v_template.version);
      end if;
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


-- Signing (or voiding) the lead designer agreement now changes who has a
-- completion statement, so re-run the whole checklist, not just due dates.
create or replace function public.appointments_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.generate_checklist(new.project_id);
  return null;
end;
$$;

do $$
declare
  v_id uuid;
begin
  for v_id in select id from public.projects loop
    perform public.generate_checklist(v_id);
  end loop;
end;
$$;
