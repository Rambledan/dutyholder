-- Phase 9: role briefings, concerns and replacement reviews (PLAN.md,
-- "The principal designer role: briefing screen" and regs 11K, 11L, 11M(4),
-- 11M(6), 11N(4), 11N(6)).
--
--   * role_briefings: one page per role, our short introduction plus the
--     role's duties in the regulations' own words (Crown copyright, reused
--     under the Open Government Licence v3.0). Versioned and never edited,
--     so a wording change never alters what someone acknowledged. Each role
--     gets a "Read your role briefing" acknowledgement as its first task; the
--     signed statement quotes the full text and its fingerprint.
--   * concerns + concern_responses: a designer's concern about related
--     design goes to the principal designer (11K(4)); a contractor's goes to
--     the principal contractor (11L(4)); comments between the principal
--     contractor and principal designer (11M(4), 11N(4)) work the same way.
--     Each needs a recorded response. Both tables are append-only.
--   * A replacement principal designer or principal contractor gets a task
--     to review the previous one's arrangements (11M(6), 11N(6)), with read
--     access to their handover document.
--
-- Security: everything requires aal2. Concerns are visible to whoever raised
-- them, to the principal designer and principal contractor (who must liaise
-- under 11M(3), 11N(3)) and to the project owner. Nobody writes the tables
-- directly; raise_concern() and respond_to_concern() check the roles.

-------------------------------------------------------------------------------
-- Role briefings
-------------------------------------------------------------------------------

create table public.role_briefings (
  id             uuid primary key default gen_random_uuid(),
  -- The checklist item that acknowledges it (e.g. 'BRF-PD').
  template_code  text not null,
  version        integer not null default 1,
  role           public.dutyholder_role not null,
  role_label     text not null,
  intro          text not null,          -- our plain-English introduction
  statutory_text text not null,          -- the regulations' own words
  sources        text[] not null,        -- legislation.gov.uk links
  created_at     timestamptz not null default now(),
  superseded_at  timestamptz,
  unique (template_code, version)
);

create unique index role_briefings_current on public.role_briefings (template_code) where superseded_at is null;

-- Same rule as duty templates: add a new version, never edit or delete.
create trigger role_briefings_immutable
  before update or delete on public.role_briefings
  for each row execute function public.duty_templates_block_changes();

alter table public.role_briefings enable row level security;

create policy "Signed-in users read role briefings"
  on public.role_briefings for select to authenticated
  using (public.is_aal2());

revoke all on public.role_briefings from anon, authenticated;
grant select on public.role_briefings to authenticated;

insert into public.duty_templates
  (code, roles, title, explanation, legal_reference, legislation_url, item_type, conditions, domestic_transfer_to, sort_order)
values
  ('BRF-CL', '{client}', $brf$Read your role briefing: client$brf$, $brf$Before your other tasks, read what the law asks of you as client, in the words of regulation 11A and regulation 11D, and confirm you have understood it.$brf$, 'Reg 11A, 11D', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11A', 'acknowledge', '{}', null, 1),
  ('BRF-PD', '{principal_designer}', $brf$Read your role briefing: principal designer$brf$, $brf$Before your other tasks, read what the law asks of you as principal designer, in the words of regulation 11M, and confirm you have understood it.$brf$, 'Reg 11M', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11M', 'acknowledge', '{}', null, 2),
  ('BRF-DES', '{designer}', $brf$Read your role briefing: designer$brf$, $brf$Before your other tasks, read what the law asks of you as designer, in the words of regulation 11J and regulation 11K, and confirm you have understood it.$brf$, 'Reg 11J, 11K', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11J', 'acknowledge', '{}', null, 3),
  ('BRF-PC', '{principal_contractor}', $brf$Read your role briefing: principal contractor$brf$, $brf$Before your other tasks, read what the law asks of you as principal contractor, in the words of regulation 11N, and confirm you have understood it.$brf$, 'Reg 11N', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11N', 'acknowledge', '{}', null, 4),
  ('BRF-CON', '{contractor}', $brf$Read your role briefing: contractor$brf$, $brf$Before your other tasks, read what the law asks of you as contractor, in the words of regulation 11J and regulation 11L, and confirm you have understood it.$brf$, 'Reg 11J, 11L', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11J', 'acknowledge', '{}', null, 5);

insert into public.role_briefings (template_code, role, role_label, intro, statutory_text, sources)
values
  ('BRF-CL', 'client', $brf$Client$brf$, $brf$As the client, you are the person or organisation the building work is being done for. The Building Regulations give you duties of your own, whatever the size of the project.

You must make suitable arrangements for planning, managing and monitoring the project, with enough time and resources, and give every designer and contractor the building information you have. Where more than one contractor is, or is likely to be, working on the project, you must appoint a principal designer and a principal contractor in writing before construction starts.

Your principal designer can help you, but these duties stay with you.$brf$, $brf$Regulation 11A: Suitable arrangements to ensure compliance with requirements etc
(1) A client must make suitable arrangements for planning, managing and monitoring a project (including allocation of sufficient time and other resources) so as to ensure compliance with all relevant requirements.
(2) Arrangements under paragraph (1) are suitable if—
(a) they ensure that the design work is carried out so that the building work to which the design relates, if built, would be in compliance with all relevant requirements;
(b) they ensure the building work is carried out in accordance with all relevant requirements;
(c) they enable the designers and contractors to cooperate with each other to ensure compliance with all relevant requirements; and
(d) they provide for periodic review of the building work (and the design work) included or to be included in the project so as to identify whether it is higher-risk building work.
(3) A client must ensure that the arrangements under paragraph (1) are maintained and reviewed throughout the project.
(4) A client must provide building information as soon as is practicable to every designer and contractor on the project.
(5) A client must cooperate with any other person working on or in relation to a project to the extent necessary to enable any person with a duty or function under these Regulations to fulfil that duty or function.
(6) Where there is more than one client in relation to a project—
(a) the clients may agree in writing which of them is to be treated for the purposes of these Regulations as the client;
(b) except for the duties specified in sub-paragraph (c), only the person who agreed to be treated as the client under sub-paragraph (a) is subject to the duties owed by a client under these Regulations;
(c) the duties in the following provisions are owed by all clients—
(i) paragraph (4) to the extent that those duties relate to information in the possession of the client or which is reasonably obtainable by or on behalf of the client;
(ii) paragraph (5); and
(iii) regulation 11B (arrangements as to information: higher-risk building work).

Regulation 11D: Principal designer and principal contractor
(1) Where there is more than one contractor, or it is reasonably foreseeable that more than one contractor will be working on a project, the client must appoint in writing—
(a) a designer with control over the design work as the principal designer for the purposes of these Regulations, and
(b) a contractor with control over the building work as the principal contractor for the purposes of these Regulations.
(2) A client is treated as complying with the requirement in paragraph (1) if, instead of appointing a person for the purposes of these Regulations, they certify, in writing, that the person who is the CDM principal designer, or, as the case may be, the CDM principal contractor, is treated as appointed as the principal designer or, as the case may be, the principal contractor, for the purposes of these Regulations.
(3) The appointments under this regulation must be made—
(a) in relation to a project which includes higher-risk building work for which an application for building control approval must be submitted to the regulator, before that application is submitted;
(b) in relation to any other project, before the construction phase begins.
(4) Where the appointment of a principal designer or the principal contractor ends before the end of the project, as soon as reasonably practicable the client must appoint a new principal designer or new principal contractor, as the case may be, under this regulation.
(5) Where the client fails to appoint a principal designer (or a replacement principal designer) or, as the case may be, a principal contractor (or a replacement principal contractor), the client must fulfil the duties of the principal designer or the principal contractor, as the case may be, under these Regulations until they appoint another person to that role.
(6) Where there is only one contractor working on a project that contractor is to be treated as appointed as the principal contractor and must fulfil the duties of the principal contractor set out in these Regulations.
(7) Where paragraph (6) applies and—
(a) there is only one designer, or it is reasonably foreseeable that there will be only one designer working on a project, that designer must fulfil the duties of the principal designer set out in these Regulations; or
(b) there is more than one designer or it is reasonably foreseeable that there will be more than one designer working on a project at any time—
(i) the designers must agree in writing which designer is to fulfil the duties of the principal designer set out in these Regulations (“the lead designer”);
(ii) the lead designer must give a copy of the agreement to the client.

[Paragraphs (8) to (10) of regulation 11D apply only to higher-risk building work and are not shown.]$brf$, array['https://www.legislation.gov.uk/uksi/2010/2214/regulation/11A', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11D']),
  ('BRF-PD', 'principal_designer', $brf$Principal designer$brf$, $brf$The client has appointed you, in writing, as the designer in control of the design work for this project. You may be an individual or a firm, such as an architect, engineer or surveyor. The role is required whenever more than one contractor is, or is likely to be, working on the project, not just on higher-risk buildings. It is separate from the CDM principal designer, although the same person can hold both roles if competent.

You don't need to be an expert in every discipline. You do need enough knowledge of the Building Regulations to plan, manage, monitor and coordinate the design so that, if built as designed, the work would comply with all relevant requirements. Each designer remains responsible for their own design.$brf$, $brf$Regulation 11M: Additional duties of a principal designer
(1) The principal designer must—
(a) plan, manage and monitor the design work during the design phase; and
(b) coordinate matters relating to the design work comprised in the project so that all reasonable steps are taken to ensure that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements.
(2) The principal designer must take all reasonable steps to ensure that—
(a) designers, and any other person involved in relation to design work, cooperate with the client, the principal designer, the principal contractor and each other;
(b) the design work of all designers is coordinated so that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements; and
(c) designers, and any other person involved in relation to design work, comply with the duties under these Regulations.
(3) The principal designer must liaise with the principal contractor and share with the principal contractor any information relevant to—
(a) the planning, management and monitoring of the building work, and
(b) the coordination of building work and design work for the purpose of ensuring compliance with all relevant requirements.
(4) Where the principal contractor provides comments to the principal designer in relation to compliance with the relevant requirements, the principal designer must have regard to those comments.
(5) The principal designer must—
(a) if requested, assist the client in providing information to other designers and contractors;
(b) when the principal designer’s appointment ends, no later than 28 days after the end of the appointment, give to the client a document explaining the arrangements it put in place to fulfil the duties under paragraphs (1) to (3).
(6) Where a replacement principal designer is appointed, they must review the arrangements the previous principal designer put in place for fulfilling the duties under paragraphs (1) to (3) so that all reasonable steps are taken to ensure that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements.$brf$, array['https://www.legislation.gov.uk/uksi/2010/2214/regulation/11M']),
  ('BRF-DES', 'designer', $brf$Designer$brf$, $brf$You are a designer on this project: you prepare or change part of the design, or arrange for someone else to. You remain responsible for your own design.

Before you start, make sure the client knows their duties. Design so that the work would comply if built as designed, give others enough information to comply, and tell the principal designer about any concern you have with related design. You can raise a concern from this project in Dutyholder, and it is kept on the record.$brf$, $brf$Regulation 11J: General duty
(1) Any person carrying out any building work must ensure the work carried out by them (and by any workers under their control) is planned, managed and monitored so as to be in compliance with all relevant requirements.
(2) Any person carrying out any design work must take all reasonable steps to ensure the design work carried out by them (and by any workers under their control) is planned, managed and monitored so that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements.
(3) Any person carrying out any building work must cooperate with the client, designers and contractors (including the principal designer and principal contractor, if any) to the extent necessary to ensure that the work is in compliance with all relevant requirements.
(4) Any person carrying out any design work must cooperate with the client, designers and contractors (including the principal designer and principal contractor, if any) to the extent necessary to ensure that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements.

Regulation 11K: Additional duties of designers
(1) A designer must not start design work unless satisfied that the client is aware of the duties owed by the client for the building work to which the design relates under all relevant requirements.
(2) When carrying out design work the designer must take all reasonable steps to ensure that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements.
(3) In providing a design, a designer must take all reasonable steps to provide sufficient information about the design, construction and maintenance of the building to assist the client, other designers and contractors to comply with all relevant requirements.
(4) Where a designer is carrying out only part of the design of the building work which comprises a project, the designer must consider other design work which directly relates to that building work and report any concerns as to compliance with all relevant requirements to the principal designer.
(5) If requested to do so, a designer must provide advice to the principal designer or the client on whether any work, to which a design they are preparing or modifying relates, is higher-risk building work.$brf$, array['https://www.legislation.gov.uk/uksi/2010/2214/regulation/11J', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11K']),
  ('BRF-PC', 'principal_contractor', $brf$Principal contractor$brf$, $brf$You are the contractor in control of the building work: either the client has appointed you in writing, or you are the only contractor, which makes you the principal contractor automatically.

You plan, manage, monitor and coordinate the building work during construction, make sure contractors cooperate and comply, and liaise with the principal designer. When your appointment ends, you have 28 days to give the client a document explaining the arrangements you made.$brf$, $brf$Regulation 11N: Additional duties of a principal contractor
(1) The principal contractor must—
(a) plan, manage and monitor the building work during the construction phase, and
(b) coordinate matters relating to the building work comprised in the project to ensure the building work is in compliance with all relevant requirements.
(2) The principal contractor must take all reasonable steps to ensure—
(a) contractors and any other person involved in relation to the building work cooperate with the client, the principal designer, the principal contractor and each other (including any successor in a role);
(b) the building work of all contractors is coordinated so that the work is in compliance with all relevant requirements; and
(c) contractors and any other person involved in relation to building work comply with the duties under these Regulations.
(3) The principal contractor must liaise with the principal designer and share with the principal designer any information relevant to—
(a) the planning, management and monitoring of the design work, and
(b) the coordination of building work and design work for the purpose of ensuring compliance with all relevant requirements.
(4) Where the principal designer provides comments to the principal contractor in relation to compliance with the relevant requirements the principal contractor must have regard to those comments.
(5) The principal contractor must—
(a) if requested, assist the client in providing information to other designers and contractors;
(b) when the principal contractor’s appointment ends, no later than 28 days after the end of the appointment, give to the client a document explaining the arrangements it put in place to fulfil the duties under paragraphs (1) to (3).
(6) Where a replacement principal contractor is appointed it must review the arrangements the previous principal contractor put in place for fulfilling the duties under paragraphs (1) to (3) to ensure that the building work is in compliance with all relevant requirements.$brf$, array['https://www.legislation.gov.uk/uksi/2010/2214/regulation/11N']),
  ('BRF-CON', 'contractor', $brf$Contractor$brf$, $brf$You are a contractor on this project: you carry out, or manage, part of the building work. You remain responsible for your own work.

Before you start, make sure the client knows their duties. Build so the work complies, supervise and inform the people working for you, and tell the principal contractor about any concern you have with related work. You can raise a concern from this project in Dutyholder, and it is kept on the record.$brf$, $brf$Regulation 11J: General duty
(1) Any person carrying out any building work must ensure the work carried out by them (and by any workers under their control) is planned, managed and monitored so as to be in compliance with all relevant requirements.
(2) Any person carrying out any design work must take all reasonable steps to ensure the design work carried out by them (and by any workers under their control) is planned, managed and monitored so that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements.
(3) Any person carrying out any building work must cooperate with the client, designers and contractors (including the principal designer and principal contractor, if any) to the extent necessary to ensure that the work is in compliance with all relevant requirements.
(4) Any person carrying out any design work must cooperate with the client, designers and contractors (including the principal designer and principal contractor, if any) to the extent necessary to ensure that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements.

Regulation 11L: Additional duties of contractors
(1) A contractor must not start any building work unless satisfied that the client is aware of the duties owed by the client under all relevant requirements.
(2) A contractor must—
(a) ensure the building work they carry out is in compliance with all relevant requirements; and
(b) provide each worker under their control with appropriate supervision, instructions and information so as to ensure that the building work is in compliance with all relevant requirements.
(3) In relation to building work, a contractor must take all reasonable steps to provide sufficient information about the work to assist the client, other contractors and designers to comply with all relevant requirements.
(4) Where a contractor is carrying out only part of the building work which comprises a project, the contractor must consider other work which directly relates to that building work and report any concerns as to compliance with all relevant requirements to the principal contractor.
(5) If requested to do so, a contractor must provide advice to the principal contractor or the client on whether any work is higher-risk building work.$brf$, array['https://www.legislation.gov.uk/uksi/2010/2214/regulation/11J', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11L']);


-- The words signed for a briefing: the full statutory text, its version and
-- fingerprint. Null for any other item.
create function public.briefing_statement_text(p_item_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select format(
    'I have read and understood my duties as %s on this project, as set out below in the words of the Building '
    'Regulations 2010 (role briefing %s v%s).' || E'\n\n' || '%s' || E'\n\n' || '[Briefing text SHA-256 %s]',
    lower(b.role_label), b.template_code, b.version, b.statutory_text, public.sha256_hex(b.statutory_text))
  from public.checklist_items i
  join public.role_briefings b on b.template_code = i.template_code and b.superseded_at is null
  where i.id = p_item_id;
$$;

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
    public.briefing_statement_text(v_item.id),
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
-- Replacement reviews (11M(6), 11N(6))
-------------------------------------------------------------------------------

insert into public.duty_templates
  (code, roles, title, explanation, legal_reference, legislation_url, item_type, conditions, domestic_transfer_to, sort_order)
values
  ('PD-11M-REVIEW', '{principal_designer}',
   'Review the previous principal designer''s arrangements',
   'You have replaced a principal designer on this project. Review the arrangements they put in place to plan, manage, monitor and coordinate the design work, starting from their handover document, and record what you found and anything you will change.',
   'Reg 11M(6)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11M',
   'form', '{"replacement": true}', null, 615),
  ('PC-11N-REVIEW', '{principal_contractor}',
   'Review the previous principal contractor''s arrangements',
   'You have replaced a principal contractor on this project. Review the arrangements they put in place to plan, manage, monitor and coordinate the building work, starting from their handover document, and record what you found and anything you will change.',
   'Reg 11N(6)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11N',
   'form', '{"replacement": true}', null, 525);

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
    select m.id, m.is_firm, m.created_at, m.appointment_ended_on,
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
    -- 11M(6), 11N(6): someone who joined after a principal in the same role
    -- left is a replacement, and must review the previous arrangements.
    and (not t.conditions ? 'replacement'
         or (t.conditions ->> 'replacement')::boolean = exists (
           select 1 from public.project_members o
           where o.project_id = p.id and o.id <> m.id and o.role = any (t.target_roles)
             and o.appointment_ended_on is not null
             and (o.created_at < m.created_at or o.appointment_ended_on <= m.created_at::date)))
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

-- For a replacement's review task: the previous principals' handover
-- documents (which the replacement couldn't otherwise read).
create function public.previous_handovers(p_item_id uuid)
returns table (name text, appointment_ended_on date, handover_text text, completed_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_item   public.checklist_items := public.assert_my_item(p_item_id);
  v_member public.project_members;
  v_role   public.dutyholder_role;
begin
  if v_item.template_code not in ('PD-11M-REVIEW', 'PC-11N-REVIEW') then
    raise exception 'This task is not a replacement review';
  end if;
  select * into v_member from public.project_members where id = v_item.member_id;
  v_role := case v_item.template_code when 'PD-11M-REVIEW' then 'principal_designer' else 'principal_contractor' end;

  return query
  select coalesce(nullif(pr.full_name, ''), nullif(o.display_name, ''), o.email),
         o.appointment_ended_on, h.answer ->> 'text', h.completed_at
  from public.project_members o
  left join public.profiles pr on pr.id = o.user_id
  left join public.checklist_items h on h.member_id = o.id and h.withdrawn_at is null
    and h.template_code = case v_role when 'principal_designer' then 'PD-11M-HANDOVER' else 'PC-11N-HANDOVER' end
  where o.project_id = v_item.project_id and o.id <> v_member.id and o.role = v_role
    and o.appointment_ended_on is not null
    and (o.created_at < v_member.created_at or o.appointment_ended_on <= v_member.created_at::date)
  order by o.appointment_ended_on;
end;
$$;

-------------------------------------------------------------------------------
-- Concerns and comments
-------------------------------------------------------------------------------

create table public.concerns (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  --   design_concern   designer -> principal designer (11K(4))
  --   building_concern contractor -> principal contractor (11L(4))
  --   pc_comment       principal contractor -> principal designer (11M(4))
  --   pd_comment       principal designer -> principal contractor (11N(4))
  kind                text not null check (kind in ('design_concern', 'building_concern', 'pc_comment', 'pd_comment')),
  raised_by_member_id uuid not null references public.project_members (id),
  raised_by           uuid not null references auth.users (id),
  subject             text not null check (length(trim(subject)) > 0),
  body                text not null check (length(trim(body)) > 0),
  body_sha256         text not null,
  ip_address          inet,
  created_at          timestamptz not null default now()
);

create index concerns_project_idx on public.concerns (project_id, created_at desc);

create table public.concern_responses (
  id                  uuid primary key default gen_random_uuid(),
  concern_id          uuid not null references public.concerns (id) on delete cascade,
  responder_member_id uuid references public.project_members (id),
  responder           uuid not null references auth.users (id),
  body                text not null check (length(trim(body)) > 0),
  body_sha256         text not null,
  ip_address          inet,
  created_at          timestamptz not null default now()
);

create index concern_responses_concern_idx on public.concern_responses (concern_id, created_at);

create trigger concerns_append_only
  before update or delete on public.concerns
  for each row execute function public.block_changes();
create trigger concern_responses_append_only
  before update or delete on public.concern_responses
  for each row execute function public.block_changes();

alter table public.concerns enable row level security;
alter table public.concern_responses enable row level security;

-- Who each kind is addressed to.
create function public.concern_to_role(p_kind text)
returns public.dutyholder_role
language sql
immutable
set search_path = ''
as $$
  select case
    when p_kind in ('design_concern', 'pc_comment') then 'principal_designer'::public.dutyholder_role
    else 'principal_contractor'::public.dutyholder_role
  end;
$$;

-- The caller's active membership holding p_role on the project. A sole
-- contractor counts as the principal contractor (11D(6)).
create function public.my_member_in_role(p_project_id uuid, p_role public.dutyholder_role)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.project_members m
  join public.projects p on p.id = m.project_id
  where m.project_id = p_project_id and m.user_id = auth.uid() and m.removed_at is null
    and (m.role = p_role
         or (p_role = 'principal_contractor' and m.role = 'contractor' and p.expected_contractors = 1))
  order by m.created_at
  limit 1;
$$;

-- Principal designers and principal contractors see every concern on the
-- project, because they must liaise with each other (11M(3), 11N(3)).
create function public.is_project_principal(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and (
    public.my_member_in_role(p_project_id, 'principal_designer') is not null
    or public.my_member_in_role(p_project_id, 'principal_contractor') is not null);
$$;

create function public.raise_concern(p_project_id uuid, p_kind text, p_subject text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project  public.projects;
  v_member   uuid;
  v_concern  uuid;
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  select * into v_project from public.projects where id = p_project_id;

  v_member := case p_kind
    when 'design_concern' then public.my_member_in_role(p_project_id, 'designer')
    when 'building_concern' then case when v_project.expected_contractors > 1
                                      then public.my_member_in_role(p_project_id, 'contractor') end
    when 'pc_comment' then public.my_member_in_role(p_project_id, 'principal_contractor')
    when 'pd_comment' then public.my_member_in_role(p_project_id, 'principal_designer')
  end;
  if p_kind not in ('design_concern', 'building_concern', 'pc_comment', 'pd_comment') then
    raise exception 'Unknown kind of concern';
  end if;
  if v_member is null then
    raise exception 'Your role on this project can''t raise this kind of concern';
  end if;
  if length(trim(coalesce(p_subject, ''))) = 0 or length(trim(coalesce(p_body, ''))) = 0 then
    raise exception 'Give the concern a short subject and describe it';
  end if;

  insert into public.concerns (project_id, kind, raised_by_member_id, raised_by, subject, body, body_sha256, ip_address)
  values (p_project_id, p_kind, v_member, auth.uid(), trim(p_subject), trim(p_body),
          public.sha256_hex(trim(p_body)), public.request_ip())
  returning id into v_concern;

  perform public.write_project_audit(p_project_id, 'concern.raised', 'concern', v_concern::text,
    jsonb_build_object('kind', p_kind, 'member_id', v_member, 'to_role', public.concern_to_role(p_kind),
                       'body_sha256', public.sha256_hex(trim(p_body))));
  return v_concern;
end;
$$;

create function public.respond_to_concern(p_concern_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_concern  public.concerns;
  v_member   uuid;
  v_response uuid;
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  select * into v_concern from public.concerns where id = p_concern_id;
  if not found then
    raise exception 'Concern not found';
  end if;

  -- The person it's addressed to responds; the owner may too (for example
  -- before a principal contractor has joined).
  v_member := public.my_member_in_role(v_concern.project_id, public.concern_to_role(v_concern.kind));
  if v_member is null and not public.is_project_owner(v_concern.project_id) then
    raise exception 'Only the % or the project owner can respond to this',
      replace(public.concern_to_role(v_concern.kind)::text, '_', ' ');
  end if;
  if v_member is null then
    select id into v_member from public.project_members
    where project_id = v_concern.project_id and user_id = auth.uid() and is_owner and removed_at is null
    limit 1;
  end if;
  if length(trim(coalesce(p_body, ''))) = 0 then
    raise exception 'Write your response';
  end if;

  insert into public.concern_responses (concern_id, responder_member_id, responder, body, body_sha256, ip_address)
  values (p_concern_id, v_member, auth.uid(), trim(p_body), public.sha256_hex(trim(p_body)), public.request_ip())
  returning id into v_response;

  perform public.write_project_audit(v_concern.project_id, 'concern.responded', 'concern', p_concern_id::text,
    jsonb_build_object('response_id', v_response, 'member_id', v_member, 'body_sha256', public.sha256_hex(trim(p_body))));
  return v_response;
end;
$$;

create policy "Raiser, principals and owner read concerns"
  on public.concerns for select to authenticated
  using (
    public.is_aal2() and public.is_project_member(project_id) and (
      public.is_project_owner(project_id)
      or public.is_project_principal(project_id)
      or exists (select 1 from public.project_members m
                 where m.id = raised_by_member_id and m.user_id = auth.uid())
    )
  );

-- Responses follow their concern (the subquery applies the policy above).
create policy "Whoever can read the concern reads its responses"
  on public.concern_responses for select to authenticated
  using (public.is_aal2() and exists (select 1 from public.concerns c where c.id = concern_id));

revoke all on public.concerns, public.concern_responses from anon, authenticated;
grant select on public.concerns, public.concern_responses to authenticated;

-------------------------------------------------------------------------------
-- Bring existing projects up to date (briefings for everyone)
-------------------------------------------------------------------------------

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
-- Function permissions
-------------------------------------------------------------------------------

revoke execute on function
  public.briefing_statement_text(uuid),
  public.previous_handovers(uuid),
  public.concern_to_role(text),
  public.my_member_in_role(uuid, public.dutyholder_role),
  public.is_project_principal(uuid),
  public.raise_concern(uuid, text, text, text),
  public.respond_to_concern(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.previous_handovers(uuid),
  public.is_project_principal(uuid),
  public.raise_concern(uuid, text, text, text),
  public.respond_to_concern(uuid, text)
to authenticated;
