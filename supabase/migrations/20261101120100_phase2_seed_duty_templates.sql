-- Phase 2: the master list of Part 2A duties (version 1), seeded from the
-- regulatory table in PLAN.md. One row per duty the tool asks someone to do.
--
-- Wording is a working draft for the principal designer (and ideally a
-- construction lawyer) to review. To change wording later, add a version 2
-- row and mark this one superseded; never edit these rows.
--
-- conditions keys: multiple_contractors, domestic_client, cdm_pd_certified,
-- member_is_firm. domestic_transfer_to: who takes a client duty over when the
-- client is domestic (null = principal contractor).

insert into public.duty_templates
  (code, roles, title, explanation, legal_reference, legislation_url, item_type, conditions, domestic_transfer_to, sort_order)
values
  -- Client ------------------------------------------------------------------
  ('CL-11A-ARRANGE', '{client}',
   'Confirm arrangements to plan, manage and monitor the project',
   'As client you must make suitable arrangements for planning, managing and monitoring the project, including allocating enough time and resources, so that the work complies with all relevant requirements.',
   'Reg 11A(1)-(3)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11A',
   'acknowledge', '{}', null, 10),

  ('CL-11A-PROGRAMME', '{client}',
   'Describe the programme and resources for the project',
   'A short note of the time and resources allowed for design and construction. It is the evidence that the arrangements above are realistic.',
   'Reg 11A(1)-(3)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11A',
   'form', '{}', null, 20),

  ('CL-11A-INFO', '{client}',
   'Provide building information to designers and contractors',
   'You must give every designer and contractor the information you have, or can reasonably get, about the building and site as soon as practicable. Upload it here so the tool can record who received it.',
   'Reg 11A(4)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11A',
   'upload', '{}', null, 30),

  ('CL-11D-APPOINT-PD', '{client}',
   'Appoint the principal designer in writing',
   'Where more than one contractor is or is likely to be working on the project, you must appoint a principal designer in writing.',
   'Reg 11D(1)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11D',
   'sign', '{"multiple_contractors": true}', null, 40),

  ('CL-11D-APPOINT-PC', '{client}',
   'Appoint the principal contractor in writing',
   'Where more than one contractor is or is likely to be working on the project, you must appoint a principal contractor in writing.',
   'Reg 11D(1)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11D',
   'sign', '{"multiple_contractors": true}', null, 50),

  ('CL-11D-CDM', '{client}',
   'Certify the CDM principal designer is also the Building Regulations principal designer',
   'You have chosen to certify that the person appointed as principal designer under CDM 2015 is also appointed as principal designer for Building Regulations purposes.',
   'Reg 11D(2)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11D',
   'sign', '{"multiple_contractors": true, "cdm_pd_certified": true}', null, 60),

  ('CL-11D-TIMING', '{client}',
   'Make the appointments before the construction phase starts',
   'The principal designer and principal contractor must be appointed before the construction phase begins.',
   'Reg 11D(3)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11D',
   'acknowledge', '{"multiple_contractors": true}', null, 70),

  ('CL-11E-REVIEW-PD', '{client}',
   'Check the principal designer''s competence',
   'You must take reasonable steps to satisfy yourself that the principal designer has the competence to carry out the role. Review their competence pack and record your decision.',
   'Reg 11E(4)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11E',
   'review', '{"multiple_contractors": true}', null, 80),

  ('CL-11E-REVIEW-PC', '{client}',
   'Check the principal contractor''s competence',
   'You must take reasonable steps to satisfy yourself that the principal contractor has the competence to carry out the role. Review their competence pack and record your decision.',
   'Reg 11E(5)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11E',
   'review', '{"multiple_contractors": true}', null, 90),

  ('CL-11E-REVIEW-ENGAGED', '{client}',
   'Check the competence of designers and contractors you engage',
   'Before anyone you engage starts work, you must take reasonable steps to satisfy yourself that they are competent. Review each competence pack and record your decision.',
   'Reg 11E(2)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11E',
   'review', '{}', null, 100),

  ('CL-11O-NOTIFY', '{client}',
   'Notify building control of the principal appointments',
   'Within 14 days of appointing a principal designer or principal contractor, the building control body must be told. For a domestic client the principal designer does this.',
   'Reg 11O', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11O',
   'form', '{"multiple_contractors": true}', 'principal_designer', 110),

  -- Everyone ---------------------------------------------------------------
  ('ALL-11J-GENERAL', '{client,principal_designer,designer,principal_contractor,contractor}',
   'Plan, manage and monitor your own work and cooperate with others',
   'Every dutyholder must plan, manage and monitor their own work so it complies with the requirements, and cooperate and share information with everyone else on the project.',
   'Reg 11J', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11J',
   'acknowledge', '{}', null, 200),

  -- Designers and contractors ----------------------------------------------
  ('ALL-11F-COMPETENCE', '{principal_designer,designer,principal_contractor,contractor}',
   'Submit your competence statement',
   'Describe your skills, knowledge, experience and behaviours (and, for a firm, your organisational capability), with evidence such as qualifications, memberships, insurance and comparable projects.',
   'Reg 11F', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11F',
   'form', '{}', null, 300),

  ('ALL-11I-CHANGE', '{principal_designer,designer,principal_contractor,contractor}',
   'Agree to report if you stop being competent',
   'If you stop meeting the competence requirements for your work, you must tell whoever appointed you. Use the "Report a change" button if that happens.',
   'Reg 11I', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11I',
   'acknowledge', '{}', null, 310),

  ('DES-11K-DESIGNER', '{principal_designer,designer}',
   'Acknowledge your duties as a designer',
   'Before starting, confirm the client knows their duties. Design so the work complies, and tell the principal designer about any concern with related design.',
   'Reg 11K', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11K',
   'acknowledge', '{}', null, 400),

  ('DES-11D-LEAD', '{principal_designer,designer}',
   'Agree in writing who is lead designer',
   'With only one contractor there is no principal designer appointment, so the designers must agree in writing which of them is the lead designer.',
   'Reg 11D(6)-(7)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11D',
   'sign', '{"multiple_contractors": false}', null, 410),

  ('CON-11L-CONTRACTOR', '{principal_contractor,contractor}',
   'Acknowledge your duties as a contractor',
   'Before starting, confirm the client knows their duties. Build so the work complies, and tell the principal contractor about any concern with related work.',
   'Reg 11L', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11L',
   'acknowledge', '{}', null, 500),

  -- Principal designer -----------------------------------------------------
  ('PD-11G-INDIVIDUAL', '{principal_designer}',
   'Name the individual who manages the principal designer role',
   'Where the principal designer is a firm, it must designate a named individual to manage the role, who must provide their own competence statement.',
   'Reg 11G(2)-(3)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11G',
   'form', '{"member_is_firm": true}', null, 600),

  ('PD-11M-ACK', '{principal_designer}',
   'Acknowledge your duties as principal designer',
   'Plan, manage, monitor and coordinate the design work; make sure designers cooperate and comply; and liaise with the principal contractor.',
   'Reg 11M(1)-(4)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11M',
   'acknowledge', '{}', null, 610),

  ('PD-11M-MATRIX', '{principal_designer}',
   'Prepare the design responsibility matrix',
   'Record which designer is responsible for each part of the design, so coordination and compliance can be managed.',
   'Reg 11M(1)-(4)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11M',
   'form', '{}', null, 620),

  ('PD-11M-HANDOVER', '{principal_designer}',
   'Give the client your handover document',
   'Within 28 days of your appointment ending, give the client a document explaining the arrangements you made to plan, manage and monitor the design work.',
   'Reg 11M(5)(b)', 'https://www.legislation.gov.uk/uksi/2010/2214/regulation/11M',
   'form', '{}', null, 630);
