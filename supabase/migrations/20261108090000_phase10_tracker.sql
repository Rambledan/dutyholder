-- Phase 10: the Relevant Requirements Tracker (PLAN.md, "The Relevant
-- Requirements Tracker" and "Tracker integration"), without AI or rules.
--
--   * catalogue_versions + requirements: the master list, seeded once from
--     /seed/tracker_requirements_seed.json (165 rows) plus regulations
--     44E-44I (on the reg 11Q list but missing from the workbook). Statutory
--     text is Crown copyright, reused under the Open Government Licence.
--     Never edited: a new edition is a new catalogue version.
--   * project_requirements: one working row per requirement per project,
--     pinned to the project's catalogue version.
--
-- Who does what (confirmed by Ian):
--   * The principal designer (or project owner) coordinates: decides
--     relevance (a reason is required for "not relevant"), assigns the
--     responsible designer and the owner per RIBA stage, and sets actions.
--   * Each responsible designer writes their own answers: route to
--     compliance, guidance followed, standard basis, how it applies to this
--     project, notes and status. The principal designer can't write them,
--     which keeps the tracker's disclaimer true.
--   * Everyone on the project can read the tracker (the principal designer
--     and principal contractor must share it, 11M(3)); all of it needs aal2.
-- Nobody writes the tables directly: the functions below check the roles
-- and log every change to the audit trail.

-------------------------------------------------------------------------------
-- The master list
-------------------------------------------------------------------------------

create table public.catalogue_versions (
  id            uuid primary key default gen_random_uuid(),
  label         text not null unique,
  in_force_from date,
  source        text not null,
  created_at    timestamptz not null default now()
);

create table public.requirements (
  id                 uuid primary key default gen_random_uuid(),
  version_id         uuid not null references public.catalogue_versions (id),
  seed_id            text not null,
  sheet              text not null,          -- e.g. 'Sch.1-Part B'
  section            text not null,
  heading            text,
  ref                text,                   -- e.g. 'B4'
  provision          text not null,
  seq                integer not null,
  sort_order         integer not null,
  requirement_text   text not null,
  legislation_url    text,
  approved_document  text,
  -- Used by "assign by discipline" (PLAN.md step 3 defaults).
  default_discipline text check (default_discipline in ('architecture', 'structural', 'fire', 'mep', 'civil', 'other')),
  unique (version_id, seed_id)
);

create index requirements_version_idx on public.requirements (version_id, sort_order);

create trigger catalogue_versions_frozen
  before update or delete on public.catalogue_versions
  for each row execute function public.block_changes();
create trigger requirements_frozen
  before update or delete on public.requirements
  for each row execute function public.block_changes();

alter table public.catalogue_versions enable row level security;
alter table public.requirements enable row level security;

create policy "Signed-in users read catalogue versions"
  on public.catalogue_versions for select to authenticated using (public.is_aal2());
create policy "Signed-in users read requirements"
  on public.requirements for select to authenticated using (public.is_aal2());

insert into public.catalogue_versions (label, in_force_from, source)
values ('England pre-FHBS', '2023-10-01',
        'Relevant Requirements Tracker workbook (11_BRPD), 165 rows, plus regulations 44E-44I; statutory text from legislation.gov.uk');

insert into public.requirements (version_id, seed_id, sheet, section, heading, ref, provision, seq, sort_order,
  requirement_text, legislation_url, approved_document, default_discipline)
select v.id, r.* from public.catalogue_versions v, (values
  ($req$Part 2-Reg 4#1$req$, $req$Part 2-Reg 4$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 4. - Requirements relating to building work$req$, $req$R4$req$, $req$Regulation 4. - (1)$req$, 1, 10, $req$(1) Subject to paragraph (2) building work shall be carried out so that—
(a)it complies with the applicable requirements contained in Schedule 1; and
(b)in complying with any such requirement there is no failure to comply with any other such requirement, except as may be provided for in paragraphs (1C) and (1D)].$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/4$req$, null, null),
  ($req$Part 2-Reg 4#2$req$, $req$Part 2-Reg 4$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 4. - Requirements relating to building work$req$, $req$R4$req$, $req$Regulation 4. - (1)$req$, 2, 20, $req$(1A) The applicable requirements contained in Schedule 1 are—
(a)the applicable requirements contained in Schedule 1 that apply in all cases, subject to paragraph (1C); and
(b)any applicable requirement contained in Schedule 1, and described in the first column of that Schedule as an optional requirement, that applies in relation to the building work in question by virtue of paragraphs (1B), (1C) and (1D).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/4$req$, null, null),
  ($req$Part 2-Reg 4#3$req$, $req$Part 2-Reg 4$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 4. - Requirements relating to building work$req$, $req$R4$req$, $req$Regulation 4. - (1)$req$, 3, 30, $req$(1B) An optional requirement as described in paragraph (1A)(b) shall apply to building work in any case where the planning permission under which the building work is carried out—
(a)specifies that optional requirement by reference to these Regulations; and
(b)makes it a condition that the requirement must be complied with.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/4$req$, null, null),
  ($req$Part 2-Reg 4#4$req$, $req$Part 2-Reg 4$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 4. - Requirements relating to building work$req$, $req$R4$req$, $req$Regulation 4. - (1)$req$, 4, 40, $req$(1C) An optional requirement shall apply in substitution for a requirement of Schedule 1 to the extent that the terms of the optional requirement in the second column of Schedule 1 so provide.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/4$req$, null, null),
  ($req$Part 2-Reg 4#5$req$, $req$Part 2-Reg 4$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 4. - Requirements relating to building work$req$, $req$R4$req$, $req$Regulation 4. - (1)$req$, 5, 50, $req$(1D) An optional requirement shall apply, and another optional requirement shall not apply, to the extent that the terms of the first-mentioned optional requirement in the second column of Schedule 1 so provide.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/4$req$, null, null),
  ($req$Part 2-Reg 4#6$req$, $req$Part 2-Reg 4$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 4. - Requirements relating to building work$req$, $req$R4$req$, $req$Regulation 4. - (2)$req$, 6, 60, $req$(2) Where—
(a)building work is of a kind described in regulation 3(1)(g), (h) or (i); and
(b)the carrying out of that work does not constitute a material alteration,
that work need only comply with the applicable requirements of Part L of Schedule 1 (in addition to the requirements of regulation 7)$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/4$req$, null, null),
  ($req$Part 2-Reg 4#7$req$, $req$Part 2-Reg 4$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 4. - Requirements relating to building work$req$, $req$R4$req$, $req$Regulation 4. - (3)$req$, 7, 70, $req$(3) Building work shall be carried out so that, after it has been completed—
(a)any building which is extended or to which a material alteration is made; or
(b)any building in, or in connection with, which a controlled service or fitting is provided, extended or materially altered; or
(c)any controlled service or fitting,
complies with the applicable requirements of Schedule 1 or, where it did not comply with any such requirement, is no more unsatisfactory in relation to that requirement than before the work was carried out.
F7[F8(4) This paragraph applies in relation to a building where—
(a)building work is undertaken in respect of that building (“relevant work”); and
(b)Part L of Schedule 1 imposes a requirement in respect of the relevant work.
(5) Notwithstanding paragraph (3), upon completion of the relevant work, any building to which paragraph (4) applies must—
(a)comply with Part F of Schedule 1; or
(b)where the building did not comply with Part F of Schedule 1 before the relevant work was begun, be no more unsatisfactory in relation to it than before the work was begun.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/4$req$, null, null),
  ($req$Part 2-Reg 6#1$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6. - (1)$req$, 1, 80, $req$6.—(1) Where there is a material change of use of the whole of a building, such work, if any, shall be carried out as is necessary to ensure that the building complies with the applicable requirements of the following paragraphs of Schedule 1—
(a)in all cases,
B1 (means of warning and escape)
B2 (internal fire spread—linings)
B3 (internal fire spread—structure)
B4(2) (external fire spread—roofs)
B5 (access and facilities for the fire service)
C2(c) (interstitial and surface condensation)
F1 (ventilation)
G1 (cold water supply)
G3(1) to (3) (hot water supply and systems)
G4 (sanitary conveniences and washing facilities)
G5 (bathrooms)
G6 (kitchens and food preparation areas)
H1 (foul water drainage)
H6 (solid waste storage)
J1 to J4 (combustion appliances)
L1 (conservation of fuel and power)
P1 (electrical safety);
S2 (infrastructure for the charging of electric vehicles)$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#2$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6. - (1)$req$, 2, 90, $req$(b)in the case of a material change of use described in regulation 5(c), (d), (e) or (f), A1 to A3 (structure)$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#3$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6. - (1)$req$, 3, 100, $req$(c)in the case of a building exceeding [eleven] metres in height, B4(1) (external fire spread—walls);$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#4$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6. - (1)$req$, 4, 110, $req$(d)in the case of a material change of use described in regulation 5(a), (b), (c), (d), (g), (h), (i) or, where the material change provides new residential accommodation, (f), C1(2) (resistance to contaminants);$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#5$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6. - (1)$req$, 5, 120, $req$(e)in the case of a material change of use described in regulation 5(a), C2 (resistance to moisture);$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#6$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6. - (1)$req$, 6, 130, $req$(f)in the case of a material change of use described in regulation 5(a), (b), (c), (g), (h) or (i), E1 to E3 (resistance to the passage of sound);$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#7$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6. - (1)$req$, 7, 140, $req$(g)in the case of a material change of use described in regulation 5(e), where the public building consists of or contains a school, E4 (acoustic conditions in schools);$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#8$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6. - (1)$req$, 8, 150, $req$(h)in the case of a material change of use described in regulation 5(a) or (b), G2 (water efficiency) and G3(4) (hot water supply and systems: hot water supply to fixed baths);$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#9$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6. - (1)$req$, 9, 160, $req$(i)in the case of a material change of use described in regulation 5(c), (d), (e) or (j), M1 (access to and use of buildings other than dwellings);$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#10$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6. - (1)$req$, 10, 170, $req$(j)in the case of a material change of use described in regulation 5(a), (b) or (g), Q1 (security).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#11$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6.- (2)$req$, 11, 180, $req$(2) Where there is a material change of use of part only of a building, such work, if any, shall be carried out as is necessary to ensure that—
(a)that part complies in all cases with any applicable requirements referred to in paragraph (1)(a);$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#12$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6.- (2)$req$, 12, 190, $req$(b)in a case in which sub-paragraphs (b), (e), (f), (g) or (h) of paragraph (1) apply, that part complies with the requirements referred to in the relevant sub-paragraph;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#13$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6.- (2)$req$, 13, 200, $req$(c)in a case to which sub-paragraph (c) of paragraph (1) applies, the whole building complies with the requirement referred to in that sub-paragraph;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#14$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6.- (2)$req$, 14, 210, $req$(d)in a case to which sub-paragraph (i) of paragraph (1) applies—
(i)that part and any sanitary conveniences provided in or in connection with that part comply with the requirements referred to in that sub-paragraph; and
(ii)the building complies with requirement M1(a) of Schedule 1 to the extent that reasonable provision is made to provide either suitable independent access to that part or suitable access through the building to that part;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#15$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6.- (2)$req$, 15, 220, $req$(e)in a case to which subparagraph (j) applies in respect of a material change of use described in regulation 5(b) or (g), that part complies with the requirement referred to in that subparagraph.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#16$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6.- (3)$req$, 16, 230, $req$(3) Subject to paragraph (4), where there is a material change of use described in regulation 5(k), such work, if any, shall be carried out as is necessary to ensure that any external wall, or specified attachment, of the building only contains materials of European Classification A2-s1, d0 or A1 (classified in accordance with the reaction to fire classification).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Reg 6#17$req$, $req$Part 2-Reg 6$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 6. - Requirements relating to material change of use$req$, $req$R6$req$, $req$Regulation 6.-(4)$req$, 17, 240, $req$(4) Paragraph (3) does not apply to the items listed in regulation 7(3).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/6$req$, null, null),
  ($req$Part 2-Regs 7-8#1$req$, $req$Part 2-Regs 7-8$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 7. - Materials and workmanship$req$, $req$R7$req$, $req$Regulation 7. - (1)$req$, 1, 250, $req$(1) Building work shall be carried out—
(a)with adequate and proper materials which—
(i)are appropriate for the circumstances in which they are used,
(ii)are adequately mixed or prepared, and
(iii)are applied, used or fixed so as adequately to perform the functions for which they are designed; and
(b)in a workmanlike manner.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/7$req$, $req$Approved Document 7$req$, null),
  ($req$Part 2-Regs 7-8#2$req$, $req$Part 2-Regs 7-8$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 7. - Materials and workmanship$req$, $req$R7$req$, $req$Regulation 7. - (1A)$req$, 2, 260, $req$1A) Building work shall be carried out so that relevant metal composite material does not become part of an external wall, or specified attachment, of any building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/7$req$, $req$Approved Document 7$req$, null),
  ($req$Part 2-Regs 7-8#3$req$, $req$Part 2-Regs 7-8$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 7. - Materials and workmanship$req$, $req$R7$req$, $req$Regulation 7. - (2)$req$, 3, 270, $req$(2) Subject to paragraph (3), building work shall be carried out so that materials which become part of an external wall, or specified attachment, of a relevant building are of European Classification A2-s1, d0 or A1 (classified in accordance with the reaction to fire classification)$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/7$req$, $req$Approved Document 7$req$, null),
  ($req$Part 2-Regs 7-8#4$req$, $req$Part 2-Regs 7-8$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 7. - Materials and workmanship$req$, $req$R7$req$, $req$Regulation 7. - (3)$req$, 4, 280, $req$(3)  Paragraph (2) does not apply to—
(a)cavity trays when used between two leaves of masonry;
(b)any part of a roof (other than any part of a roof which falls within paragraph (iv) of regulation 2(6)) if that part is connected to an external wall;
(c)door frames and doors;
(d)electrical installations;
(da)fibre optic cables;
(e)insulation and water proofing materials used below ground level or up to 300mm above that level;
(f)intumescent and fire stopping materials where the inclusion of the materials is necessary to meet the requirements of Part B of Schedule 1;
(g)membranes;
(h)seals, gaskets, fixings, sealants and backer rods;
(ha)components associated with a solar shading device excluding components whose primary function is to provide shade or deflect sunlight such as the awning curtain or slats;
(i)thermal break materials where the inclusion of the materials is necessary to meet the thermal bridging requirements of Part L of Schedule 1;
(j)window frames and glass; or
(k)materials which form the top horizontal floor layer of a balcony which are of European Classification A1fl or A2fl-s1 (classified in accordance with the reaction to fire classification) provided that the entire layer has an imperforate substrate under it$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/7$req$, $req$Approved Document 7$req$, null),
  ($req$Part 2-Regs 7-8#5$req$, $req$Part 2-Regs 7-8$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 7. - Materials and workmanship$req$, $req$R7$req$, $req$Regulation 7. - (4)$req$, 5, 290, $req$(4) In this regulation—
(a)a “relevant building” means a building with a storey (not including roof-top plant areas or any storey consisting exclusively of plant rooms) at least 18 metres above ground level and which—
(i)contains one or more dwellings;
(ii)contains an institution; or
(iii)contains a room for residential purposes; and
(b)“above ground level” in relation to a storey means above ground level when measured from the lowest ground level adjoining the outside of a building to the top of the floor surface of the storey.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/7$req$, $req$Approved Document 7$req$, null),
  ($req$Part 2-Regs 7-8#6$req$, $req$Part 2-Regs 7-8$req$, $req$Building Regulations Part 2 Control of Building Work$req$, $req$Regulation 8. - Limitation on requirements$req$, $req$R8$req$, $req$Regulation 8.$req$, 6, 300, $req$8.  Parts A to D, F to K, , N and P (except for paragraphs G2, H2 and J7) of Schedule 1 shall not require anything to be done except for the purpose of securing reasonable standards of health and safety for persons in or about buildings (and any others who may be affected by buildings, or matters connected with buildings).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/8$req$, null, null),
  ($req$Part 6-Regs 22-28#1$req$, $req$Part 6-Regs 22-28$req$, $req$Building Regulations Part 6 - Energy Efficiency Requirements$req$, $req$Regulation 22. - Requirements relating to a change to energy status$req$, $req$R22$req$, $req$Regulation 22.$req$, 1, 310, $req$22.  Where there is a change to a building's energy status, such work, if any, shall be carried out as is necessary to ensure that the building complies with the applicable requirements of Part L of Schedule 1.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/22$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Part 6-Regs 22-28#2$req$, $req$Part 6-Regs 22-28$req$, $req$Building Regulations Part 6 - Energy Efficiency Requirements$req$, $req$Regulation 23. - Requirements for the renovation or replacement of thermal elements$req$, $req$R23$req$, $req$Regulation 23.-(1)$req$, 2, 320, $req$23 - (1) Where the renovation of an individual thermal element—
(a)constitutes a major renovation; or
(b)amounts to the renovation of more than 50% of the element’s surface area;
the renovation must be carried out so as to ensure that the whole of the element complies with paragraph L1(a)(i) of Schedule 1, in so far as that is technically, functionally and economically feasible.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/23$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Part 6-Regs 22-28#3$req$, $req$Part 6-Regs 22-28$req$, $req$Building Regulations Part 6 - Energy Efficiency Requirements$req$, $req$Regulation 23. - Requirements for the renovation or replacement of thermal elements$req$, $req$R23$req$, $req$Regulation 23.-(2)$req$, 3, 330, $req$(2) Where the whole or any part of an individual thermal element is proposed to be replaced and the replacement—
(a)constitutes a major renovation; or
(b)(in the case of part replacement) amounts to the replacement of more than 50% of the thermal element’s surface area;
the whole of the thermal element must be replaced so as to ensure that it complies with paragraph L1(a)(i) of Schedule 1, in so far as that is technically, functionally and economically feasible.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/23$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Part 6-Regs 22-28#4$req$, $req$Part 6-Regs 22-28$req$, $req$Building Regulations Part 6 - Energy Efficiency Requirements$req$, $req$Regulation 25B. - Nearly zero-energy requirements for new buildings$req$, $req$R25B$req$, $req$Regulation 25B.$req$, 4, 340, $req$25B.  Where a building is erected, it must be a nearly zero-energy building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/25B$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Part 6-Regs 22-28#5$req$, $req$Part 6-Regs 22-28$req$, $req$Building Regulations Part 6 - Energy Efficiency Requirements$req$, $req$Regulation 26. - CO² emission rates for new buildings$req$, $req$R26$req$, $req$Regulation 26.$req$, 5, 350, $req$26.  Where a building is erected, it shall not exceed the target CO² emission rate for the building that has been approved pursuant to regulation 25, applying the methodology of calculation and expression of the energy performance of buildings approved pursuant to regulation 24$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/26$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Part 6-Regs 22-28#6$req$, $req$Part 6-Regs 22-28$req$, $req$Building Regulations Part 6 - Energy Efficiency Requirements$req$, $req$Regulation 26A. - Fabric energy efficiency rates$req$, $req$R26A$req$, $req$Regulation 26A.$req$, 6, 360, $req$26A.  Where a dwelling is erected, it shall not exceed the target fabric energy efficiency rate for the dwelling that has been approved pursuant to regulation 25, applying the methodology of calculation and expression of the energy performance of buildings approved pursuant to regulation 24.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/26A$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Part 6-Regs 22-28#7$req$, $req$Part 6-Regs 22-28$req$, $req$Building Regulations Part 6 - Energy Efficiency Requirements$req$, $req$Regulation 28. - Consequential improvements to energy performance$req$, $req$R28$req$, $req$Regulation 28.$req$, 7, 370, $req$28.—(1) Paragraph (2) applies to an existing building with a total useful floor area over 1,000m2 where the proposed building work consists of or includes—

(a)an extension;
(b)the initial provision of any fixed building services; or
(c)an increase to the installed capacity of any fixed building services.
(2) Subject to paragraph (3), where this paragraph applies, such work, if any, shall be carried out as is necessary to ensure that the building complies with the requirements of Part L of Schedule 1.

(3) Nothing in paragraph (2) requires work to be carried out if it is not technically, functionally and economically feasible.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/28$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Part 7-Reg 36#1$req$, $req$Part 7-Reg 36$req$, $req$Building Regulations Part 7 - Water Efficiency$req$, $req$Regulation 36. - Water efficiency of new dwellings$req$, $req$R36$req$, $req$Regulation 36.$req$, 1, 380, $req$36.—(1) The potential consumption of wholesome water by persons occupying a new dwelling must not exceed the requirement in paragraph (2).
(2) The requirement referred to in paragraph (1) is either—
(a)125 litres per person per day; or
(b)in a case to which paragraph (3) applies, the optional requirement of 110 litres per person per day,
as measured in either case in accordance with a methodology approved by the Secretary of State.
(3) This paragraph applies where the planning permission under which the building work is carried out—
(a)specifies the optional requirement in paragraph (2)(b); and
(b)makes it a condition that that requirement must be complied with.
(4) In this Part, “new dwelling” does not include a dwelling that is formed by a material change of use of a building within the meaning of regulation 5(g).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/36$req$, $req$Approved Document G$req$, null),
  ($req$Part 9-Regs 41-44#1$req$, $req$Part 9-Regs 41-44$req$, $req$Building Regulations Part 9 - Testing and Commissioning$req$, $req$Regulation 41. - Sound insulation testing$req$, $req$R41$req$, $req$Regulation 41.-(2)$req$, 1, 390, $req$41 (2) Where this regulation applies, the person carrying out the work shall, for the purpose of ensuring compliance with paragraph El of Schedule 1—
(a)ensure that appropriate sound insulation testing is carried out in accordance with a procedure approved by the Secretary of State; and
(b)give a copy of the results of the testing referred to in sub-paragraph (a) to the local authority.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/41$req$, $req$Approved Document E$req$, $req$mep$req$),
  ($req$Part 9-Regs 41-44#2$req$, $req$Part 9-Regs 41-44$req$, $req$Building Regulations Part 9 - Testing and Commissioning$req$, $req$Regulation 42. - Mechanical ventilation air flow rate testing$req$, $req$R42$req$, $req$Regulation 42.-(2)(a)$req$, 2, 400, $req$42.—(2) The person carrying out the work shall, for the purpose of ensuring compliance with paragraph (1) of Schedule 1—
(a)ensure that testing of the mechanical ventilation air flow rate is carried out in accordance with a procedure approved by the Secretary of State; and
(b)give notice of the results of the testing to the building control authority.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/42$req$, $req$Approved Document F$req$, $req$mep$req$),
  ($req$Part 9-Regs 41-44#3$req$, $req$Part 9-Regs 41-44$req$, $req$Building Regulations Part 9 - Testing and Commissioning$req$, $req$Regulation 43. - Pressure testing$req$, $req$R43$req$, $req$Regulation 43.-(2)(a)$req$, 3, 410, $req$43.—(2) Where this regulation applies, the person carrying out the work shall, for the purpose of ensuring compliance with regulation 26 and regulation 26A and paragraph L1(a)(i) of Schedule 1—
(a)ensure that—
(i)pressure testing is carried out in such circumstances as are approved by the Secretary of State; and
(ii)the testing is carried out in accordance with a procedure approved by the Secretary of State; and
(b)subject to paragraph (5), give notice of the results of the testing to the local authority building control authority.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/43$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Part 9-Regs 41-44#4$req$, $req$Part 9-Regs 41-44$req$, $req$Building Regulations Part 9 - Testing and Commissioning$req$, $req$Regulation 44ZA. - Commissioning in respect of a system for on-site electricity generation$req$, $req$R44ZA$req$, $req$Regulation 44ZA.$req$, 4, 420, $req$44ZA.—(1) This regulation applies to building work in respect of a building in relation to which paragraph L2 of Schedule 1 imposes a requirement, but does not apply to the provision or extension of any system for on-site electricity generation where testing and adjustment is not possible.
(2) Where this regulation applies the person carrying out the work must, for the purpose of ensuring compliance with paragraph L2 of Schedule 1, give to the building control authority a notice confirming that the system for on-site electricity generation has been commissioned.
(3) The notice must be given—
(a)in the case where the building work is higher-risk building work for which an application for a completion certificate is required, to the regulator with the application;
(b)in any other case, to the building control authority—
(i)not later than the date on which the notice required by regulation 16(4) is required to be given; or
(ii)where that regulation does not apply, not more than 30 days after completion of the work.
(4) Where the regulator is the building control authority by virtue of section 91ZB of the Act (the regulator: building control authority for other work), it must send a copy of each notice it receives under this regulation in relation to a building to the local authority for the area in which the building is situated.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44ZA$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Part 9A-Reg 44ZC-44A#1$req$, $req$Part 9A-Reg 44ZC-44A$req$, $req$Building Regulations Part 9A - Infrastructure for electronic communications$req$, $req$Regulation 44ZC. - Cases in which paragraph RA2 of Schedule 1 modified or excluded$req$, $req$R44ZC$req$, $req$Regulation 44ZC.-(1)$req$, 1, 430, $req$44ZC.-(1) The requirement in paragraph RA2 of Schedule 1 has effect subject to paragraphs (2) to (4).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44ZC$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Part 9A-Reg 44ZC-44A#2$req$, $req$Part 9A-Reg 44ZC-44A$req$, $req$Building Regulations Part 9A - Infrastructure for electronic communications$req$, $req$Regulation 44ZC. - Cases in which paragraph RA2 of Schedule 1 modified or excluded$req$, $req$R44ZC$req$, $req$Regulation 44ZC.-(2)$req$, 2, 440, $req$(2) Where a person carrying out building work of the kind described in the second column of paragraph RA1 of Schedule 1 (“the developer”)—
(a)is unable to secure the provision of a connection with a gigabit-capable public electronic communications network for a cost not exceeding the cost cap, but
(b)is able to secure the provision of a connection with a high-speed public electronic communications network for such a cost,$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44ZC$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Part 9A-Reg 44ZC-44A#3$req$, $req$Part 9A-Reg 44ZC-44A$req$, $req$Building Regulations Part 9A - Infrastructure for electronic communications$req$, $req$Regulation 44ZC. - Cases in which paragraph RA2 of Schedule 1 modified or excluded$req$, $req$R44ZC$req$, $req$Regulation 44ZC.-(2)$req$, 3, 450, $req$paragraph RA2 of Schedule 1 is to be read as requiring the provision of a connection with a high-speed public electronic communications network.
(3) Where the developer—
(a)is unable to secure the provision of a connection with a high-speed public electronic communications network for a cost not exceeding the cost cap, but
(b)is able to secure the provision of a connection with a USO-standard public electronic communications network for such a cost,$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44ZC$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Part 9A-Reg 44ZC-44A#4$req$, $req$Part 9A-Reg 44ZC-44A$req$, $req$Building Regulations Part 9A - Infrastructure for electronic communications$req$, $req$Regulation 44ZC. - Cases in which paragraph RA2 of Schedule 1 modified or excluded$req$, $req$R44ZC$req$, $req$Regulation 44ZC.-(4)$req$, 4, 460, $req$paragraph RA2 of Schedule 1 is to be read as requiring the provision of a connection with a USO-standard public electronic communications network.
(4) Where the developer is unable to secure the provision of a connection with a USO-standard public electronic communications network for a cost not exceeding the cost cap, paragraph RA2 of Schedule 1 does not apply.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44ZC$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Part 9A-Reg 44ZC-44A#5$req$, $req$Part 9A-Reg 44ZC-44A$req$, $req$Building Regulations Part 9A - Infrastructure for electronic communications$req$, $req$Regulation 44ZC. - Cases in which paragraph RA2 of Schedule 1 modified or excluded$req$, $req$R44ZC$req$, $req$Regulation 44ZC.-(5)$req$, 5, 470, $req$(5) In paragraphs (2) to (4)—
“high-speed public electronic communications network” means a public electronic communications network that is a high-speed electronic communications network;“USO-standard public electronic communications network” means a public electronic communications network that provides at least the minimum download speed for the time being specified by virtue of section 65(2B)(a) of the Communications Act 2003 in the universal service order (as defined by section 151(1) of that Act).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44ZC$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Part 9A-Reg 44ZC-44A#6$req$, $req$Part 9A-Reg 44ZC-44A$req$, $req$Building Regulations Part 9A - Infrastructure for electronic communications$req$, $req$Regulation 44ZC. - Cases in which paragraph RA2 of Schedule 1 modified or excluded$req$, $req$R44ZC$req$, $req$Regulation 44ZC.-(6)$req$, 6, 480, $req$(6) The developer is to be treated as being able to secure the provision of a connection mentioned in any of paragraphs (2) to (4) for a cost not exceeding the cost cap unless—
(a)the developer has invited at least two suitable providers to make, before the end of the 30th day after the date of the invitation, an offer to provide a connection of the kind mentioned in the paragraph in question, and
(b)none of those providers has before that time offered to provide that connection free of charge or at a cost not exceeding the cost cap.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44ZC$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Part 9A-Reg 44ZC-44A#7$req$, $req$Part 9A-Reg 44ZC-44A$req$, $req$Building Regulations Part 9A - Infrastructure for electronic communications$req$, $req$Regulation 44ZC. - Cases in which paragraph RA2 of Schedule 1 modified or excluded$req$, $req$R44ZC$req$, $req$Regulation 44ZC.-(7)$req$, 7, 490, $req$(7) The cost cap is £2,000 in respect of each dwelling.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44ZC$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Part 9A-Reg 44ZC-44A#8$req$, $req$Part 9A-Reg 44ZC-44A$req$, $req$Building Regulations Part 9A - Infrastructure for electronic communications$req$, $req$Regulation 44ZC. - Cases in which paragraph RA2 of Schedule 1 modified or excluded$req$, $req$R44ZC$req$, $req$Regulation 44ZC.-(8)$req$, 8, 500, $req$(8) In calculating the cost to the developer of securing the provision of a connection—

(a)there is to be included value added tax;
(b)there is to be excluded—
(i)the cost to the developer of installing gigabit-ready physical infrastructure in accordance with paragraph RA1 of Schedule 1,
(ii)administrative costs of the developer, and
(iii)the cost to an end-user (as defined by section 151(1) of the Communications Act 2003) of the provision of a public electronic communications service.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44ZC$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Part 9A-Reg 44ZC-44A#9$req$, $req$Part 9A-Reg 44ZC-44A$req$, $req$Building Regulations Part 9A - Infrastructure for electronic communications$req$, $req$Regulation 44ZC. - Cases in which paragraph RA2 of Schedule 1 modified or excluded$req$, $req$R44ZC$req$, $req$Regulation 44ZC.-(9)$req$, 9, 510, $req$(9) In paragraph (6)(a) “suitable provider” means the provider of a public electronic communications network whom the developer reasonably considers to be likely to be able to provide the connection referred to.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44ZC$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Part 9A-Reg 44ZC-44A#10$req$, $req$Part 9A-Reg 44ZC-44A$req$, $req$Building Regulations Part 9A - Infrastructure for electronic communications$req$, $req$Regulation 44A. - Application of paragraph R1 of Schedule 1 to educational buildings, buildings of statutory undertakers and Crown buildings$req$, $req$R44A$req$, $req$Regulation 44A$req$, 10, 520, $req$44A.—(1) The requirements of paragraph R1 (in-building physical infrastructure for high-speed electronic communications networks) of Schedule 1 apply (insofar as applicable to other buildings) also to—
(a)educational buildings and buildings of statutory undertakers (notwithstanding section 4(1) of the Act);
(b)Crown buildings; and
(c)building work carried out or proposed to be carried out by Crown authorities.
(2) In this regulation “educational buildings and buildings of statutory undertakers” means buildings that fall within paragraphs (a), (b) or (c) of section 4(1) of the Act.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44A$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Part 9B-Reg 44D#1$req$, $req$Part 9B-Reg 44D$req$, $req$Building Regulations Part 9B - Infrastructure for the charging of electric vehicles$req$, $req$Regulation 44D. - Application of paragraph S1 of Schedule 1 (the erection of new residential buildings)$req$, $req$R44D$req$, $req$Regulation 44D.-(1)$req$, 1, 530, $req$(1) The requirements of paragraph S1 of Schedule 1 apply in relation to the erection of a new residential building with associated parking as follows.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44D$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Part 9B-Reg 44D#2$req$, $req$Part 9B-Reg 44D$req$, $req$Building Regulations Part 9B - Infrastructure for the charging of electric vehicles$req$, $req$Regulation 44D. - Application of paragraph S1 of Schedule 1 (the erection of new residential buildings)$req$, $req$R44D$req$, $req$44D (2)$req$, 2, 540, $req$(2) The number of electric vehicle charge points that must be installed is the maximum number of electric vehicle charge points that it is possible to install at an average sum of £3600 or less for the connection cost of each electric vehicle charge point connection (“the £3600 cap”).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44D$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Part 9B-Reg 44D#3$req$, $req$Part 9B-Reg 44D$req$, $req$Building Regulations Part 9B - Infrastructure for the charging of electric vehicles$req$, $req$Regulation 44D. - Application of paragraph S1 of Schedule 1 (the erection of new residential buildings)$req$, $req$R44D$req$, $req$44D (3)$req$, 3, 550, $req$(3) If it is not possible to completely fulfil the requirements of paragraph S1(2) of Schedule 1 as a result of the operation of the £3600 cap, cable routes for electric vehicle charge points must be installed in the associated parking spaces that would otherwise be required to have electric vehicle charge points, but for the operation of the £3600 cap.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44D$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Part 9B-Reg 44D#4$req$, $req$Part 9B-Reg 44D$req$, $req$Building Regulations Part 9B - Infrastructure for the charging of electric vehicles$req$, $req$Regulation 44D. - Application of paragraph S1 of Schedule 1 (the erection of new residential buildings)$req$, $req$R44D$req$, $req$44D (4)$req$, 4, 560, $req$(4) Where the new residential building has, or will have, associated parking that is situated within a covered car park—

(a)if there are or will be any associated parking spaces situated in a position other than in a covered car park—
(i)the requirements of paragraph S1 of Schedule 1 must first be applied in relation to those parking spaces; then
(ii)if the number of associated parking spaces, which are situated in a position other than in a covered car park, is insufficient to completely fulfil the requirements of paragraph S1(2) of Schedule 1, cable routes for electric vehicle charge points must be installed in—
(aa)the number of parking spaces in the covered car park which, when added to the number of associated parking spaces which are situated in a position other than in the covered car park, corresponds to the total number of dwellings with associated parking, where the total number of associated parking spaces is 10 or less;
(bb)all the associated parking spaces in the covered car park, where the total number of associated parking spaces is both less than the number of dwellings with associated parking and 10 or less; and
(cc)all the associated parking spaces in the covered car park, where the total number of associated parking spaces is more than 10;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44D$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Part 9B-Reg 44D#5$req$, $req$Part 9B-Reg 44D$req$, $req$Building Regulations Part 9B - Infrastructure for the charging of electric vehicles$req$, $req$Regulation 44D. - Application of paragraph S1 of Schedule 1 (the erection of new residential buildings)$req$, $req$R44D$req$, $req$44D (5)$req$, 5, 570, $req$(b)if all the associated parking spaces are situated in a covered car park, cable routes for electric vehicle charge points must be installed—
(i)where there are 10 or fewer parking spaces—
(aa)in the number of associated parking spaces in the covered car park which corresponds to the total number of dwellings with associated parking;
(bb)in all the parking spaces where there are fewer parking spaces than there are dwellings;
(ii)in all the parking spaces in the covered car park, where there are more than 10 parking spaces.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44D$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Part 9B-Regs 44E-44I#1$req$, $req$Part 9B-Regs 44E-44I$req$, $req$Building Regulations Part 9B - Infrastructure for the charging of electric vehicles$req$, $req$Regulation 44E. - Application of paragraph S2 of Schedule 1 (dwellings resulting from a material change of use)$req$, $req$R44E$req$, $req$Regulation 44E$req$, 1, 580, $req$(1) The requirements of paragraph S2 of Schedule 1 apply to a building, or a part of a building, undergoing a material change of use to result in one or more dwellings as follows.
(2) The requirements of paragraph S2 of Schedule 1 apply—
(a) if—
(i) the circumstances specified in regulation 5(a), (b) or (g) apply; and
(ii) the material change of use involves building work being done which includes work being done to any of the following—
(aa) to a car park that is located within the site boundary of the building, where the nature of the work is such that it would be reasonable to expect that work to include enabling the requirements of paragraph S2 of Schedule 1 to be fulfilled;
(bb) the electrical infrastructure of a car park, where that car park is located within the site boundary of the building;
(cc) the electrical infrastructure of the building, where a car park is located inside the building;
(b) subject to paragraph (3), if an electric vehicle charge point for each dwelling resulting from a building, or a part of a building, undergoing a material change of use can be accommodated within the incoming electrical supply to the building without having to upgrade the capacity of the incoming electrical supply to the building; and
(c) if the building is not one in relation to which paragraph (4) applies.
(3) If paragraph (2)(a) and (c) applies, but electric vehicle charge points for some but not all of the dwellings resulting from a building, or a part of a building, undergoing a material change of use can be accommodated within the incoming electrical supply to that building—
(a) the requirements of paragraph S2 of Schedule 1 apply in respect of the maximum number of electric vehicle charge points that can be accommodated within the incoming electrical supply; and
(b) cable routes for electric vehicle charge points must be installed in the associated parking spaces that would otherwise have been required under paragraph S2 of Schedule 1 to have had electric vehicle charge points installed.
(4) The requirements of paragraph S2 of Schedule 1 do not apply if a building, or a part of a building, is—
(a) listed in accordance with section 1 of the Planning (Listed Buildings and Conservation Areas) Act 1990;
(b) in a conservation area designated in accordance with section 69 of that Act; or
(c) included in the schedule of monuments maintained under section 1 of the Ancient Monuments and Archaeological Areas Act 1979, where compliance with the requirements of paragraph S2 of Schedule 1 would unacceptably alter the building’s character or appearance.
(5) If the building, or a part of a building, undergoing a material change of use to result in one or more dwellings has, or will have, associated parking that is situated within a covered car park—
(a) if there are or will be any associated parking spaces situated in a position other than in a covered car park—
(i) the requirements of paragraph S2 of Schedule 1 must first be applied in relation to those associated parking spaces; then
(ii) if the number of associated parking spaces, which are situated in a position other than in a covered car park, is insufficient to completely fulfil the requirements of paragraph S2 of Schedule 1, cable routes for electric vehicle charge points must be installed in—
(aa) all the associated parking spaces in the covered car park, where the total number of parking spaces is less than the number of such dwellings with associated parking; or
(bb) the number of associated parking spaces in the covered car park which, when added to the number of associated parking spaces which are situated in a position other than in a covered car park, corresponds to the total number of such dwellings with associated parking;
(b) if all the associated parking spaces are situated in a covered car park, cable routes for electric vehicle charge points must be installed in—
(i) all those associated parking spaces, where there are fewer parking spaces than there are such dwellings with associated parking; or
(ii) the number of those associated parking spaces that corresponds to the total number of such dwellings with associated parking.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44E$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Part 9B-Regs 44E-44I#2$req$, $req$Part 9B-Regs 44E-44I$req$, $req$Building Regulations Part 9B - Infrastructure for the charging of electric vehicles$req$, $req$Regulation 44F. - Application of paragraph S3 of Schedule 1 (residential buildings undergoing major renovation)$req$, $req$R44F$req$, $req$Regulation 44F$req$, 2, 590, $req$(1) The requirements of paragraph S3 of Schedule 1 apply to a residential building undergoing major renovation as follows.
(2) The requirements of paragraph S3 of Schedule 1 apply if—
(a) the major renovation involves building work being done which includes work being done to any of the following—
(i) a car park that is located within the site boundary of the building, where the nature of the work is such that it would be reasonable to expect that work to include enabling the requirements of paragraph S3 of Schedule 1 to be fulfilled;
(ii) the electrical infrastructure of a car park, where the car park is located within the site boundary of the building;
(iii) the electrical infrastructure of the building, where a car park is located inside the building;
(b) the residential building will have more than 10 associated parking spaces upon completion of that work;
(c) subject to paragraph (3), all the required electric vehicle charge points can be accommodated within the incoming electrical supply to the building;
(d) the cost of installing all the required electric vehicle charge points and cable routes for electric vehicle charge points does not exceed 7% of the total cost of the major renovation; and
(e) the residential building is not one in relation to which paragraph (5) applies.
(3) If paragraph (2)(a), (b) and (e) applies, but all the required electric vehicle charge points cannot be accommodated within the incoming electrical supply to the building—
(a) the requirements of paragraph S3 of Schedule 1 apply in respect of the maximum number of electric vehicle charge points that can be accommodated within the incoming electrical supply to the building; and
(b) cable routes for electric vehicle charge points must be installed in all remaining associated parking spaces.
(4) If the cost of installing the required electric vehicle charge points and cable routes for electric vehicle charge points exceeds 7% of the total cost of the major renovation—
(a) the residential building is exempt from the requirement to install any electric vehicle charge point; and
(b) cable routes for electric vehicle charge points must be installed in all associated parking spaces, except where the cost of that installation exceeds 7% of the total cost of the major renovation.
(5) The requirements of paragraph S3 of Schedule 1 do not apply to a residential building which is undergoing major renovation for the principal purpose of improving the fire safety of the external walls or roof of the building.
(6) If a residential building undergoing major renovation has, or will have more than 10 associated parking spaces—
(a) if there are or will be any associated parking spaces situated in a position other than in a covered car park—
(i) the requirements of paragraph S3 of Schedule 1 must first be applied in relation to those associated parking spaces; then
(ii) cable routes for electric vehicle charge points must be installed in all the associated parking spaces in the covered car park;
(b) if all the associated parking spaces are situated in a covered car park, cable routes for electric vehicle charge points must be installed in all the parking spaces in the covered car park.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44F$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Part 9B-Regs 44E-44I#3$req$, $req$Part 9B-Regs 44E-44I$req$, $req$Building Regulations Part 9B - Infrastructure for the charging of electric vehicles$req$, $req$Regulation 44G. - Application of paragraph S4 of Schedule 1 (erection of new buildings which are not residential buildings or mixed-use buildings)$req$, $req$R44G$req$, $req$Regulation 44G$req$, 3, 600, $req$(1) The requirements of paragraph S4 of Schedule 1 apply to the erection of a new building which is not a residential building or a mixed-use building (“new building”) as follows.
(2) If such a new building has, or will have, within its site boundary, more than 10 parking spaces—
(a) if there are or will be any parking spaces situated in a position other than in a covered car park—
(i) the requirements of paragraph S4 of Schedule 1 must first be applied in relation to those parking spaces; then
(ii) if the number of parking spaces which are situated in a position other than in a covered car park is insufficient to completely fulfil the requirements of paragraph S4 of Schedule 1, cable routes for electric vehicle charge points must be installed in a sufficient number of parking spaces in the covered car park in order to ensure compliance with the requirements of paragraph S4(b) of Schedule 1;
(b) if all the parking spaces are situated in a covered car park, cable routes for electric vehicle charge points must be installed in a minimum of one fifth of the total number of those parking spaces.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44G$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Part 9B-Regs 44E-44I#4$req$, $req$Part 9B-Regs 44E-44I$req$, $req$Building Regulations Part 9B - Infrastructure for the charging of electric vehicles$req$, $req$Regulation 44H. - Application of paragraph S5 of Schedule 1 (buildings undergoing major renovation which are not residential buildings or mixed-use buildings)$req$, $req$R44H$req$, $req$Regulation 44H$req$, 4, 610, $req$(1) The requirements of paragraph S5 of Schedule 1 apply to a building undergoing major renovation, which is not a residential building or a mixed-use building, as follows.
(2) The requirements of paragraph S5 of Schedule 1 apply to such a building if—
(a) the major renovation involves building work being done which includes work being done to any of the following—
(i) a car park that is located within the site boundary of the building, where the nature of the work is such that it would be reasonable to expect the requirements of paragraph S5 of Schedule 1 to be fulfilled;
(ii) the electrical infrastructure of a car park, where the car park is located within the site boundary of the building;
(iii) the electrical infrastructure of the building, where a car park is located inside the building;
(b) upon completion of that major renovation, the building will have more than 10 parking spaces situated within the site boundary of the building;
(c) the cost of installing the required electric vehicle charge point and cable routes for electric vehicle charge points does not exceed 7% of the total cost of the major renovation.
(3) If the cost of installing the required electric vehicle charge point and cable routes for electric vehicle charge points exceeds 7% of the total cost of the major renovation—
(a) such a building is exempt from the requirement to install the electric vehicle charge point; and
(b) cable routes for electric vehicle charge points must be installed in a minimum of one fifth of the total number of parking spaces, except where the cost of that installation exceeds 7% of the total cost of the major renovation.
(4) If such a building has, or will have, within its site boundary, more than 10 parking spaces—
(a) if there are or will be any parking spaces situated in a position other than in a covered car park—
(i) the requirements of paragraph S5 of Schedule 1 must first be applied in relation to those parking spaces; then
(ii) if the number of parking spaces which are situated in a position other than in a covered car park is insufficient to completely fulfil the requirements of paragraph S5 of Schedule 1, cable routes for electric vehicle charge points must be installed in the number of parking spaces in the covered car park in order to ensure compliance with the requirements of paragraph S5(b) of Schedule 1;
(b) if all the parking spaces are situated in a covered car park, cable routes for electric vehicle charge points must be installed in a minimum of one fifth of the total number of those parking spaces.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44H$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Part 9B-Regs 44E-44I#5$req$, $req$Part 9B-Regs 44E-44I$req$, $req$Building Regulations Part 9B - Infrastructure for the charging of electric vehicles$req$, $req$Regulation 44I. - Application of paragraph S6 of Schedule 1 (the erection of new mixed-use buildings and mixed-use buildings undergoing major renovation)$req$, $req$R44I$req$, $req$Regulation 44I$req$, 5, 620, $req$(1) The requirements of paragraph S6 of Schedule 1 apply to the erection of a new mixed-use building and a mixed-use building undergoing major renovation as follows.
(2) The requirements of paragraph S6 of Schedule 1 apply if, upon completion, such a mixed-use building will have at least one parking space situated within the site boundary of the building.
(3) If such a mixed-use building has, or will have, within its site boundary, a covered car park—
(a) if there are or will be any parking spaces situated in a position other than in a covered car park—
(i) the requirements of paragraph S6 of Schedule 1 must first be applied in relation to those parking spaces; then
(ii) if the number of parking spaces, which are situated in a position other than in a covered car park, is insufficient to completely fulfil the requirements of paragraph S6 of Schedule 1, cable routes for electric vehicle charge points must be installed in accordance with—
(aa) regulation 44D(4)(a), in relation to the associated parking spaces for one or more dwellings in a new mixed-use building;
(bb) regulation 44F(6)(a), in relation to the associated parking spaces for one or more dwellings in a mixed-use building undergoing major renovation;
(cc) regulation 44G(2)(a), in relation to the parking spaces for one or more premises that are not dwellings in a new mixed-use building;
(dd) regulation 44H(4)(a), in relation to the parking spaces for one or more premises that are not dwellings in a mixed-use building undergoing major renovation;
(b) if all the parking spaces are situated in a covered car park, cable routes for electric vehicle charge points must be installed in accordance with—
(i) regulation 44D(4)(b), in relation to the associated parking spaces for one or more dwellings in a new mixed-use building;
(ii) regulation 44F(6)(b), in relation to the associated parking spaces for one or more dwellings in a mixed-use building undergoing major renovation;
(iii) regulation 44G(2)(b), in relation to the parking spaces for one or more new premises that are not dwellings in a new mixed-use building;
(iv) regulation 44H(4)(b), in relation to the parking spaces for one or more premises that are not dwellings in a mixed-use building undergoing major renovation.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/regulation/44I$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Sch.1-Part A#1$req$, $req$Sch.1-Part A$req$, $req$Schedule 1 Part A Structure$req$, null, $req$A1$req$, $req$A1 Loading$req$, 1, 630, $req$(1) The building shall be constructed so that the combined dead, imposed and wind loads are sustained and transmitted by it to the ground—
(a) safely; and
(b) without causing such deflection or deformation of any part of the building, or such movement of the ground, as will impair the stability of any part of another building$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document A$req$, $req$structural$req$),
  ($req$Sch.1-Part A#2$req$, $req$Sch.1-Part A$req$, $req$Schedule 1 Part A Structure$req$, null, $req$A1$req$, $req$A1 Loading$req$, 2, 640, $req$(2) In assessing whether a building complies with sub-paragraph (1) regard shall be had to the imposed and wind loads to which it is likely to be subjected in the ordinary course of its use for the purpose for which it is intended.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document A$req$, $req$structural$req$),
  ($req$Sch.1-Part A#3$req$, $req$Sch.1-Part A$req$, $req$Schedule 1 Part A Structure$req$, null, $req$A2$req$, $req$A2 Ground Movement$req$, 3, 650, $req$The building shall be constructed so that ground movement caused by—
(a) swelling, shrinkage or freezing of the subsoil; or
(b) land-slip or subsidence (other than subsidence arising from shrinkage), in so far as the risk can be reasonably foreseen,
will not impair the stability of any part of the building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document A$req$, $req$structural$req$),
  ($req$Sch.1-Part A#4$req$, $req$Sch.1-Part A$req$, $req$Schedule 1 Part A Structure$req$, null, $req$A3$req$, $req$A3 Disproportionate Collapse$req$, 4, 660, $req$The building shall be constructed so that in the event of an accident the building will not suffer collapse to an extent disproportionate to the cause.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document A$req$, $req$structural$req$),
  ($req$Sch.1-Part B#1$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B1$req$, $req$B1 Means of Warning & Escape$req$, 1, 670, $req$The building shall be designed and constructed so that there are appropriate provisions for the early warning of fire, and appropriate means of escape in case of fire from the building to a place of safety outside the
building capable of being safely and effectively used
at all material times.
Requirement B1 does not apply to any prison provided under section 33 of the Prison Act 1952 (power to provide prisons etc).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part B#2$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B2$req$, $req$B2 Internal Fire Spread (linings)$req$, 2, 680, $req$(1) To inhibit the spread of fire within the building,
the internal linings shall—
 (a) adequately resist the spread of flame over their surfaces; and
 (b) have, if ignited, either a rate of heat release or a rate of fire growth, which is reasonable in the circumstances.
(2) In this paragraph “internal linings” means the materials or products used in lining any partition, wall, ceiling or other internal structure$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part B#3$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B3$req$, $req$B3 Internal Fire Spread (structure)$req$, 3, 690, $req$(1) The building shall be designed and constructed so that, in the event of fire, its stability will be maintained for a reasonable period$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part B#4$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B3$req$, $req$B3 Internal Fire Spread (structure)$req$, 4, 700, $req$(2) A wall common to two or more buildings shall be designed and constructed so that it adequately resists the spread of fire between those buildings. For the purposes of this sub-paragraph a house in
a terrace and a semi-detached house are each to be treated as a separate building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part B#5$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B3$req$, $req$B3 Internal Fire Spread (structure)$req$, 5, 710, $req$(3) Where reasonably necessary to inhibit the spread of fire within the building, measures shall be taken, to an extent appropriate to the size and intended use of the building, comprising either or
both of the following—
 (a) sub-division of the building with fire-resisting construction;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part B#6$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B3$req$, $req$B3 Internal Fire Spread (structure)$req$, 6, 720, $req$(b) installation of suitable automatic fire suppression systems.
Requirement B3(3) does not apply to material alterations to any prison provided under section 33 of the Prison Act 1952.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part B#7$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B3$req$, $req$B3 Internal Fire Spread (structure)$req$, 7, 730, $req$(4) The building shall be designed and constructed so that the unseen spread of fire and smoke within concealed spaces in its structure and fabric is inhibited.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part B#8$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B4$req$, $req$B4 External fire spread$req$, 8, 740, $req$(1) The external walls of the building shall adequately resist the spread of fire over the walls and from one building to another having regard to the height, use and position of the building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part B#9$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B4$req$, $req$B4 External fire spread$req$, 9, 750, $req$(2) The roof of the building shall adequately resist the spread of fire over the roof and from one building to another, having regard to the use and position of the building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part B#10$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B5$req$, $req$B5 Access and facilities for the fire service$req$, 10, 760, $req$(1) The building shall be designed and constructed so as to provide reasonable facilities to assist fire fighters in the protection of life.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part B#11$req$, $req$Sch.1-Part B$req$, $req$Schedule 1 Part B Fire Safety$req$, null, $req$B5$req$, $req$B5 Access and facilities for the fire service$req$, 11, 770, $req$(2) Reasonable provision shall be made within the site of the building to enable fire appliances to gain access to the building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document B$req$, $req$fire$req$),
  ($req$Sch.1-Part C#1$req$, $req$Sch.1-Part C$req$, $req$Schedule 1 Part C Site Preparation and Resistance to Contaminants and Moisture$req$, null, $req$C1$req$, $req$C1 Preparation of site and resistance to contaminants$req$, 1, 780, $req$(1) The ground to be covered by the building shall be reasonably free from any material that might damage the building or affect its stability, including vegetable matter, topsoil and pre-existing foundations.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document C$req$, null),
  ($req$Sch.1-Part C#2$req$, $req$Sch.1-Part C$req$, $req$Schedule 1 Part C Site Preparation and Resistance to Contaminants and Moisture$req$, null, $req$C1$req$, $req$C1 Preparation of site and resistance to contaminants$req$, 2, 790, $req$(2) Reasonable precautions shall be taken to avoid danger to health and safety caused by contaminants on or in the ground covered, or to be covered by the building and any land associated with the building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document C$req$, null),
  ($req$Sch.1-Part C#3$req$, $req$Sch.1-Part C$req$, $req$Schedule 1 Part C Site Preparation and Resistance to Contaminants and Moisture$req$, null, $req$C1$req$, $req$C1 Preparation of site and resistance to contaminants$req$, 3, 800, $req$(3) Adequate sub-soil drainage shall be provided, if it is needed to avoid—
(a) the passage of ground moisture to the interior of the building;
(b) damage to the building, including damage through the transport of water-borne contaminants to the foundations of the building.
(4) For the purposes of this requirement, “contaminant” means any substance which is or may become harmful to persons or buildings including substances which are corrosive, explosive flammable, radioactive or toxic$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document C$req$, null),
  ($req$Sch.1-Part C#4$req$, $req$Sch.1-Part C$req$, $req$Schedule 1 Part C Site Preparation and Resistance to Contaminants and Moisture$req$, null, $req$C2$req$, $req$C2 Resistance to moisture$req$, 4, 810, $req$The walls, floors and roof of the building shall adequately protect the building and people who use the building from harmful effects caused by—$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document C$req$, null),
  ($req$Sch.1-Part C#5$req$, $req$Sch.1-Part C$req$, $req$Schedule 1 Part C Site Preparation and Resistance to Contaminants and Moisture$req$, null, $req$C2$req$, $req$C2 Resistance to moisture$req$, 5, 820, $req$(a) ground moisture;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document C$req$, null),
  ($req$Sch.1-Part C#6$req$, $req$Sch.1-Part C$req$, $req$Schedule 1 Part C Site Preparation and Resistance to Contaminants and Moisture$req$, null, $req$C2$req$, $req$C2 Resistance to moisture$req$, 6, 830, $req$(b) precipitation including wind-driven spray;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document C$req$, null),
  ($req$Sch.1-Part C#7$req$, $req$Sch.1-Part C$req$, $req$Schedule 1 Part C Site Preparation and Resistance to Contaminants and Moisture$req$, null, $req$C2$req$, $req$C2 Resistance to moisture$req$, 7, 840, $req$(c) interstitial and surface condensation; and$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document C$req$, null),
  ($req$Sch.1-Part C#8$req$, $req$Sch.1-Part C$req$, $req$Schedule 1 Part C Site Preparation and Resistance to Contaminants and Moisture$req$, null, $req$C2$req$, $req$C2 Resistance to moisture$req$, 8, 850, $req$(d) spillage of water from or associated with sanitary fittings or fixed appliances.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document C$req$, null),
  ($req$Sch.1-Part D#1$req$, $req$Sch.1-Part D$req$, $req$Schedule 1 Part D Toxic Substances$req$, null, $req$D1$req$, $req$D1 Cavity insulation$req$, 1, 860, $req$If insulating material is inserted into a cavity in a cavity wall, reasonable precautions shall be taken to prevent the subsequent permeation of any toxic fumes from that material into any part of the building occupied by people.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document D$req$, $req$architecture$req$),
  ($req$Sch.1-Part E#1$req$, $req$Sch.1-Part E$req$, $req$Schedule 1 Part E Resistance to the Passage of Sound$req$, null, $req$E1$req$, $req$E1 Protection against sound from other parts of the building and adjoining buildings$req$, 1, 870, $req$Dwelling-houses, flats and rooms for residential purposes shall be designed and constructed in such a way that they provide reasonable resistance to sound from other parts of the same building and from adjoining buildings.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document E$req$, null),
  ($req$Sch.1-Part E#2$req$, $req$Sch.1-Part E$req$, $req$Schedule 1 Part E Resistance to the Passage of Sound$req$, null, $req$E2$req$, $req$E2 Protection against sound within a dwelling-house etc$req$, 2, 880, $req$Dwelling-houses, flats and rooms for residential purposes shall be designed and constructed in such a way that—
(a) internal walls between a bedroom or a room containing a water closet, and other rooms; and
(b) internal floors,
provide reasonable resistance to sound.
Requirement E2 does not apply to—
(a) an internal wall which contains a door;
(b) an internal wall which separates an ensuite toilet from the associated bedroom;
(c) existing walls and floors in a building which is subject to a material change of use.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document E$req$, null),
  ($req$Sch.1-Part E#3$req$, $req$Sch.1-Part E$req$, $req$Schedule 1 Part E Resistance to the Passage of Sound$req$, null, $req$E3$req$, $req$E3 Reverberation in common internal parts of buildings containing flats or rooms for residential purposes$req$, 3, 890, $req$The common internal parts of buildings which contain flats or rooms for residential purposes shall be designed and constructed in such a way as to prevent more reverberation around the common parts than is reasonable.
Requirement E3 only applies to corridors, stairwells, hallways and entrance halls which give access to the flat or room for residential purposes.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document E$req$, null),
  ($req$Sch.1-Part E#4$req$, $req$Sch.1-Part E$req$, $req$Schedule 1 Part E Resistance to the Passage of Sound$req$, null, $req$E4$req$, $req$E4 Acoustic conditions in schools$req$, 4, 900, $req$(1) Each room or other space in a school building shall be designed and constructed in such a way that it has the acoustic conditions and the insulation against disturbance by noise appropriate to its intended use.
(2) For the purposes of this Part—
“school” has the same meaning as in section 4 of the Education Act 1996; and
“school building” means any building forming a school or part of a school.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document E$req$, null),
  ($req$Sch.1-Part F#1$req$, $req$Sch.1-Part F$req$, $req$Schedule 1 Part F Ventilation$req$, null, $req$F1$req$, $req$F1 Means of ventilation$req$, 1, 910, $req$(1) There shall be adequate means of ventilation provided for people in the building.
Requirement F1 does not apply to a building or space within a building—
(a) into which people do not normally go;
(b) which is used solely for storage; or
(c) which is a garage used solely in connection with a single dwelling.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document F$req$, $req$mep$req$),
  ($req$Sch.1-Part F#2$req$, $req$Sch.1-Part F$req$, $req$Schedule 1 Part F Ventilation$req$, null, $req$F1$req$, $req$F1 Means of ventilation$req$, 2, 920, $req$(2) Fixed systems for mechanical ventilation and any associated controls must be commissioned by testing and adjusting as necessary to secure that the objective referred to in sub-paragraph (1) is met.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document F$req$, $req$mep$req$),
  ($req$Sch.1-Part G#1$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G1$req$, $req$G1 Cold water supply$req$, 1, 930, $req$(1) There must be a suitable installation for the provision of—
(a) wholesome water to any place where drinking water is drawn off;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#2$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G1$req$, $req$G1 Cold water supply$req$, 2, 940, $req$(b) wholesome water or softened wholesome water to any washbasin or bidet provided in or adjacent to a room containing a sanitary convenience;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#3$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G1$req$, $req$G1 Cold water supply$req$, 3, 950, $req$(c) wholesome water or softened wholesome water to any washbasin, bidet, fixed bath and shower in a bathroom;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#4$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G1$req$, $req$G1 Cold water supply$req$, 4, 960, $req$(d) wholesome water to any sink provided in any area where food is prepared.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#5$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G1$req$, $req$G1 Cold water supply$req$, 5, 970, $req$(2) There must be a suitable installation for the provision of water of suitable quality to any sanitary convenience fitted with a flushing device.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#6$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G2$req$, $req$G2 Water efficiency$req$, 6, 980, $req$Reasonable provision must be made by the installation of fittings and fixed appliances that use water efficiently for the prevention of undue consumption of water.
Requirement G2 applies only when a dwelling is—
(a) erected; or
(b) formed by a material change of use of a building within the meaning of regulation 5(a) or (b).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#7$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G2A$req$, $req$G2A Water efficiency of new buildings other than dwellings and healthcare buildings$req$, 7, 990, $req$Reasonable provision must be made in the design and installation of any sanitary convenience, washbasin or shower so as to prevent the undue consumption of water.
Requirement G2A applies only to building work that consists of the erection or extension of a building which is not a dwelling or a healthcare building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#8$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G3$req$, $req$Hot water supply and systems$req$, 8, 1000, $req$(1) There must be a suitable installation for the provision of heated wholesome water or heated softened water to—
(a) any washbasin or bidet provided in or adjacent to a room containing a sanitary convenience;
(b) any washbasin, bidet, fixed bath and shower in a bathroom; and
(c) any sink provided in any area where food is prepared.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#9$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G3$req$, $req$Hot water supply and systems$req$, 9, 1010, $req$(2) A hot water system, including any cistern or other vessel that supplies water to or receives expansion water from a hot water system, must be designed, constructed and installed so as to resist the effects of temperature and pressure that may occur either in normal use or in the event of such malfunctions as may reasonably be anticipated, and must be adequately supported.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#10$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G3$req$, $req$Hot water supply and systems$req$, 10, 1020, $req$(3) A hot water system that has a hot water storage vessel must incorporate precautions to—
(a) prevent the temperature of the water stored in the vessel at any time exceeding 100°C;
(b) ensure that any discharge from safety devices is safely conveyed to where it is visible but will not cause a danger to persons in or about the building.
Requirement G3(3) does not apply to a system which heats or stores water for the purposes only of an industrial process.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#11$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G3$req$, $req$Hot water supply and systems$req$, 11, 1030, $req$(4) The hot water supply to any fixed bath must be so designed and installed as to incorporate measures to ensure that the temperature of the water than can be delivered to that bath does not exceed 48°C.
Requirement G3(4) applies only when a dwelling is—
(a) erected; or
(b) formed by a material change of use of a building within the meaning of regulation 5(a) or (b).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#12$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G4$req$, $req$G4 Sanitary conveniences and washing facilities$req$, 12, 1040, $req$(1) Adequate and suitable sanitary conveniences must be provided in rooms provided to accommodate them or in bathrooms.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#13$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G4$req$, $req$G4 Sanitary conveniences and washing facilities$req$, 13, 1050, $req$(2) Adequate hand washing facilities must be provided in—
(a) rooms containing sanitary conveniences; or
(b) rooms or spaces adjacent to rooms containing sanitary conveniences.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#14$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G4$req$, $req$G4 Sanitary conveniences and washing facilities$req$, 14, 1060, $req$(3) Any room containing a sanitary convenience, a bidet, or any facility for washing hands provided in accordance with sub-paragraph (2)(b), must be separated from any kitchen or any area where food is prepared.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#15$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G5$req$, $req$G5 Bathrooms$req$, 15, 1070, $req$A bathroom must be provided containing a washbasin and either a fixed bath or a shower.
Requirement G5 applies only to dwellings and to buildings containing one or more rooms for residential purposes.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part G#16$req$, $req$Sch.1-Part G$req$, $req$Schedule 1 Part G Sanitation, hot water safety and water efficiency$req$, null, $req$G6$req$, $req$G6 Kitchens and food preparation areas$req$, 16, 1080, $req$A suitable sink must be provided in any area where food is prepared.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document G$req$, $req$mep$req$),
  ($req$Sch.1-Part H#1$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H1$req$, $req$H1 Foul water drainage$req$, 1, 1090, $req$(1) An adequate system of drainage shall be provided to carry foul water from appliances within the building to one of the following, listed in order of priority—
(a) a public sewer; or where that is not reasonably practicable,
(b) a private sewer communicating with a public sewer; or where that is not reasonably practicable,
(c) either a septic tank which has an appropriate form of secondary treatment or another wastewater treatment system; or, where that is not reasonably practicable,
(d) a cesspool.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#2$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H1$req$, $req$H1 Foul water drainage$req$, 2, 1100, $req$(2) In this Part “foul water” means waste water which comprises or includes—
(a) waste from a sanitary convenience, bidet or appliance used for washing receptacles for foul waste; or
(b) water which has been used for food preparation, cooking or washing.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#3$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H2$req$, $req$H2 Wastewater treatment systems and cesspools$req$, 3, 1110, $req$(1) Any septic tank and its form of secondary treatment, other wastewater treatment system or cesspool, shall be so sited and constructed that—
(a) it is not prejudicial to the health of any person;
(b) it will not contaminate any watercourse, underground water or water supply;
(c) there are adequate means of access for emptying and maintenance; and
(d) where relevant, it will function to a sufficient standard for the protection of health in the event of a power failure$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#4$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H2$req$, $req$H2 Wastewater treatment systems and cesspools$req$, 4, 1120, $req$(2) Any septic tank or holding tank which is part of a wastewater treatment system or cesspool shall be—
(a) of adequate capacity;
(b) so constructed that it is impermeable to liquids; and
(c) adequately ventilated.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#5$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H2$req$, $req$H2 Wastewater treatment systems and cesspools$req$, 5, 1130, $req$(3) Where a foul water drainage system from a building discharges to a septic tank, wastewater treatment system or cesspool, a durable notice shall be affixed in a suitable place in the building containing information on any continuing maintenance required to avoid risks to health.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#6$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H3$req$, $req$H3 Rainwater drainage$req$, 6, 1140, $req$(1) Adequate provision shall be made for rainwater to be carried from the roof of the building.
Requirement H1 does not apply to the diversion of water which has been used for personal washing or for the washing of clothes, linen or other articles to collection systems for reuse.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#7$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H3$req$, $req$H3 Rainwater drainage$req$, 7, 1150, $req$(2) Paved areas around the building shall be so constructed as to be adequately drained.
Requirement H3(2) applies only to paved areas—
(a) which provide access to the building pursuant to requirement M1 (access and use), or M1 (access to and use of buildings other than dwellings), requirement M2 (access to extensions to buildings other than dwellings), or requirement M4(1), (2) or (3) (access to and use of dwellings);
(b) which provide access to or from a place of storage pursuant to requirement H6(2) (solid waste storage); or
(c) in any passage giving access to the building, where this is intended to be used in common by the occupiers of one or more other buildings$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#8$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H3$req$, $req$H3 Rainwater drainage$req$, 8, 1160, $req$(3) Rainwater from a system provided pursuant to sub-paragraphs (1) or (2) shall discharge to one of the following, listed in order of priority—
(a) an adequate soakaway or some other adequate infiltration system; or, where that is not reasonably practicable,
(b) a watercourse; or, where that is not reasonably practicable,
(c) a sewer.
Requirement H3(3) does not apply to the gathering of rainwater for reuse.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#9$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H4$req$, $req$H4 Building over sewers$req$, 9, 1170, $req$(1) The erection or extension of a building or work involving the underpinning of a building shall be carried out in a way that is not detrimental to the building or building extension or to the continued maintenance of the drain, sewer or disposal main.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#10$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H4$req$, $req$H4 Building over sewers$req$, 10, 1180, $req$(2) In this paragraph “disposal main” means any pipe, tunnel or conduit used for the conveyance of effluent to or from a sewage disposal works, which is not a public sewer.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#11$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H4$req$, $req$H4 Building over sewers$req$, 11, 1190, $req$(3) In this paragraph and paragraph H5 “map of sewers” means any records kept by a sewerage undertaker under section 199 of the Water Industry Act 1991.
Requirement H4 applies only to work carried out—
(a) over a drain, sewer or disposal main which is shown on any map of sewers; or
(b) on any site or in such a manner as may result in interference with the use of, or obstruction of the access of any person to, any drain, sewer or disposal main which is shown on any map of sewers.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#12$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H5$req$, $req$H5 Separate systems of drainage$req$, 12, 1200, $req$Any system for discharging water to a sewer which is provided pursuant to paragraph H3 shall be separate from that provided for the conveyance of foul water from the building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#13$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H6$req$, $req$H6 Solid waste storages$req$, 13, 1210, $req$(1) Adequate provision shall be made for storage of solid waste.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part H#14$req$, $req$Sch.1-Part H$req$, $req$Schedule 1 Part H Drainage and waste disposal$req$, null, $req$H6$req$, $req$H6 Solid waste storages$req$, 14, 1220, $req$(2) Adequate means of access shall be provided—
(a) for people in the building to the place of storage; and
(b) from the place of storage to a collection point (where one has been specified by the waste collection authority under section 46 (household waste) or section 47 (commercial waste) of the Environmental Protection Act 1990) or to a street (where no collection point has been specified).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document H$req$, $req$civil$req$),
  ($req$Sch.1-Part J#1$req$, $req$Sch.1-Part J$req$, $req$Schedule 1 Part J Combustion appliances and fuel storage systems$req$, null, $req$J1$req$, $req$J1 Air supply$req$, 1, 1230, $req$Combustion appliances shall be so installed that there is an adequate supply of air to them for combustion, to prevent over-heating and for the efficient working of any flue.
Requirements J1 and J2 apply only to fixed combustion appliances (including incinerators).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document J$req$, $req$mep$req$),
  ($req$Sch.1-Part J#2$req$, $req$Sch.1-Part J$req$, $req$Schedule 1 Part J Combustion appliances and fuel storage systems$req$, null, $req$J2$req$, $req$J2 Discharge of products of combustion$req$, 2, 1240, $req$Combustion appliances shall have adequate provision for the discharge of products of combustion to the outside air.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document J$req$, $req$mep$req$),
  ($req$Sch.1-Part J#3$req$, $req$Sch.1-Part J$req$, $req$Schedule 1 Part J Combustion appliances and fuel storage systems$req$, null, $req$J3$req$, $req$J3 Warning of release of carbon monoxide$req$, 3, 1250, $req$Where a combustion appliance is provided, appropriate provision having regard to the design and location of the appliance shall be made to detect and give early warning of the release of carbon monoxide at levels harmful to persons.
Requirement J3 applies only to fixed combustion appliances located in dwellings.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document J$req$, $req$mep$req$),
  ($req$Sch.1-Part J#4$req$, $req$Sch.1-Part J$req$, $req$Schedule 1 Part J Combustion appliances and fuel storage systems$req$, null, $req$J4$req$, $req$J4 Protection of building$req$, 4, 1260, $req$Combustion appliances and flue-pipes shall be so installed, and fireplaces and chimneys shall be so constructed and installed, as to reduce to a reasonable level the risk of people suffering burns or the building catching fire in consequence of their use.
Requirement J4 applies only to fixed combustion appliances (including incinerators).$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document J$req$, $req$mep$req$),
  ($req$Sch.1-Part J#5$req$, $req$Sch.1-Part J$req$, $req$Schedule 1 Part J Combustion appliances and fuel storage systems$req$, null, $req$J5$req$, $req$J5 Provision of information$req$, 5, 1270, $req$Where a hearth, fireplace, flue or chimney is provided or extended, a durable notice containing information on the performance capabilities of the hearth, fireplace, flue or chimney shall be affixed in a suitable place in the building for the purpose of enabling combustion appliances to be safely installed.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document J$req$, $req$mep$req$),
  ($req$Sch.1-Part J#6$req$, $req$Sch.1-Part J$req$, $req$Schedule 1 Part J Combustion appliances and fuel storage systems$req$, null, $req$J6$req$, $req$J6 Protection of liquid fuel storage systems$req$, 6, 1280, $req$Liquid fuel storage systems and the pipes connecting them to combustion appliances shall be so constructed and separated from buildings and the boundary of the premises as to reduce to a reasonable level the risk of the fuel igniting in the event of fire in adjacent buildings or premises.
Requirement J6 applies only to—
(a) fixed oil storage tanks with capacities greater than 90 litres and connecting pipes; and
(b) fixed liquefied petroleum gas storage installations with capacities greater than 150 litres and connecting pipes,
which are located outside the building and which serve fixed combustion appliances (including incinerators) in the building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document J$req$, $req$mep$req$),
  ($req$Sch.1-Part J#7$req$, $req$Sch.1-Part J$req$, $req$Schedule 1 Part J Combustion appliances and fuel storage systems$req$, null, $req$J7$req$, $req$J7 Protection against pollution$req$, 7, 1290, $req$Oil storage tanks and the pipes connecting them to combustion appliances shall—
(a) be so constructed and protected as to reduce to a reasonable level the risk of the oil escaping and causing pollution; and
(b) have affixed in a prominent position a durable notice containing information on how to respond to an oil escape so as to reduce to a reasonable level the risk of pollution.
Requirement J7 applies only to fixed oil storage tanks with capacities of 3,500 litres or less, and connecting pipes, which are—
(a) located outside the building; and
(b) serve fixed combustion appliances (including incinerators) in a building used wholly or mainly as a private dwelling,
but does not apply to buried systems.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document J$req$, $req$mep$req$),
  ($req$Sch.1-Part K#1$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K1$req$, $req$K1 Stairs, ladders and ramps$req$, 1, 1300, $req$Stairs, ladders and ramps shall be so designed, constructed and installed as to be safe for people moving between different levels in or about the building.
Requirement K1 applies only to stairs, ladders and ramps which form part of the building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#2$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K2$req$, $req$K2 Protection from falling$req$, 2, 1310, $req$(a) Any stairs, ramps, floors and balconies and any roof to which people have access, and
(b) any light well, basement area or similar sunken area connected to a building,
shall be provided with barriers where it is necessary to protect people in or about the building from falling.
Requirement K2(a) applies only to stairs and ramps which form part of the building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#3$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K3$req$, $req$K3 Vehicle barriers and loading bays$req$, 3, 1320, $req$(1) Vehicle ramps and any levels in a building to which vehicles have access, shall be provided with barriers where it is necessary to protect people in or about the building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#4$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K3$req$, $req$K3 Vehicle barriers and loading bays$req$, 4, 1330, $req$(2) Vehicle loading bays shall be constructed in such a way, or be provided with such features as may be necessary to protect people in them from collision with vehicles.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#5$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K4$req$, $req$K4 Protection from collision with open windows etc$req$, 5, 1340, $req$Glazing, with which people are likely to come into contact while moving in or about the building, shall—
(a) if broken on impact, break in a way which is unlikely to cause injury; or
(b) resist impact without breaking; or
(c) be shielded or protected from impact.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#6$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K5$req$, $req$K5.1 Protection from collision with open windows etc.$req$, 6, 1350, $req$(1) Provision shall be made to prevent people from moving in or about the building from colliding with open windows, skylights or ventilators.
Requirement K5.1 does not apply to dwellings.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#7$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K5$req$, $req$K5.2 Manifestation of glazing$req$, 7, 1360, $req$Transparent glazing with which people are likely to come into contact while moving in and about the building, shall incorporate features which make it apparent.
Requirement K5.2 does not apply to dwellings.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#8$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K5$req$, $req$K5.3 Safe opening and closing of windows etc.$req$, 8, 1370, $req$Windows, skylights and ventilators which can be opened by people in or about the building shall be so constructed or equipped that they may be opened, closed or adjusted safely.
Requirement K5.3 does not apply to dwellings.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#9$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K5$req$, $req$K5.4 Safe access for cleaning windows etc.$req$, 9, 1380, $req$Provision shall be made for any windows, skylights or translucent walls, ceilings or roofs to be safely accessible for cleaning.
(b) Requirement K5(4) does not apply to—
(a) dwellings, or
(b) any transparent or translucent elements whose surfaces are not intended to be cleaned.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#10$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K6$req$, $req$K6 Protection against impact from trapping by doors.$req$, 10, 1390, $req$(1) Provision shall be made to prevent any door or gate—
(a) which slides or opens upwards, from falling onto any person; and
(b) which is powered, from trapping any person.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#11$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K6$req$, $req$K6 Protection against impact from trapping by doors.$req$, 11, 1400, $req$(2) Provision shall be made for powered doors and gates to be opened in the event of a power failure.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part K#12$req$, $req$Sch.1-Part K$req$, $req$Schedule 1 Part K Protection from falling, collision and impact$req$, null, $req$K6$req$, $req$K6 Protection against impact from trapping by doors.$req$, 12, 1410, $req$(3) Provision shall be made to ensure a clear view of the space on either side of a swing door or gate.
Requirement K5(4) does not apply to—
(a) dwellings, or
(b) any door or gate which is part of a lift$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document K$req$, $req$architecture$req$),
  ($req$Sch.1-Part L#1$req$, $req$Sch.1-Part L$req$, $req$Schedule 1 Part L Conservation of fuel and power$req$, null, $req$L1$req$, $req$L1 Conservation of fuel and power$req$, 1, 1420, $req$Reasonable provision shall be made for the conservation of fuel and power in buildings by—
(a) limiting heat gains and loses—
(i) through thermal elements and other parts of the building fabric; and$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Sch.1-Part L#2$req$, $req$Sch.1-Part L$req$, $req$Schedule 1 Part L Conservation of fuel and power$req$, null, $req$L1$req$, $req$L1 Conservation of fuel and power$req$, 2, 1430, $req$(ii) from pipes, ducts and vessels used for space heating, space cooling and hot water services;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Sch.1-Part L#3$req$, $req$Sch.1-Part L$req$, $req$Schedule 1 Part L Conservation of fuel and power$req$, null, $req$L1$req$, $req$L1 Conservation of fuel and power$req$, 3, 1440, $req$(b) providing fixed building services which—
(i) are energy efficient to a reasonable standard;
(ii) have effective controls; and
(iii) are commissioned by testing and adjusting as necessary to ensure they use no more fuel and power than is reasonable in the circumstances.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Sch.1-Part L#4$req$, $req$Sch.1-Part L$req$, $req$Schedule 1 Part L Conservation of fuel and power$req$, null, $req$L2$req$, $req$L2 On-site generation of electricity$req$, 4, 1450, $req$Where a system for on-site electricity generation is installed—
(a) reasonable provision must be made to ensure that—
(i) the system and its electrical output are appropriately sized for the site and available infrastructure;
(ii) the system has effective controls; and
(b) it must be commissioned by testing and adjusting as necessary to ensure that it produces the maximum electricity that is reasonable in the circumstances$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document L$req$, $req$mep$req$),
  ($req$Sch.1-Part M#1$req$, $req$Sch.1-Part M$req$, $req$Schedule 1 Part M Access to and use of buildings$req$, null, $req$M1$req$, $req$M1 Access to and use of buildings other than dwellings$req$, 1, 1460, $req$Reasonable provision must be made for people to—
(a) gain access to; and
(b) use, the building and its facilities.
Requirement M1 does not apply to
any part of a building that is used solely to enable the building or any service or fitting in the building to be inspected, repaired or maintained.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document M$req$, $req$architecture$req$),
  ($req$Sch.1-Part M#2$req$, $req$Sch.1-Part M$req$, $req$Schedule 1 Part M Access to and use of buildings$req$, null, $req$M2$req$, $req$M2 Access to extensions to buildings other than dwellings$req$, 2, 1470, $req$Suitable independent access must be provided to the extension where reasonably practicable.
Requirement M2 does not apply where suitable access to the extension is provided through the building that is extended.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document M$req$, $req$architecture$req$),
  ($req$Sch.1-Part M#3$req$, $req$Sch.1-Part M$req$, $req$Schedule 1 Part M Access to and use of buildings$req$, null, $req$M3$req$, $req$M3 Sanitary conveniences in extensions to buildings other than dwellings$req$, 3, 1480, $req$If sanitary conveniences are provided in any building that is to be extended, reasonable provision shall be made within the extension for sanitary conveniences.
Requirement M3 does not apply where there is reasonable provision for sanitary conveniences elsewhere in the building, such that people occupied in, or otherwise having occasion to enter the extension, can gain access to and use those sanitary conveniences.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document M$req$, $req$architecture$req$),
  ($req$Sch.1-Part M#4$req$, $req$Sch.1-Part M$req$, $req$Schedule 1 Part M Access to and use of buildings$req$, null, $req$M4$req$, $req$M4(1) Access to and use of dwellings Category 1- visitable dwelling$req$, 4, 1490, $req$Reasonable provision must be made for people to—
(a) gain access to; and
(b) use, the dwelling and its facilities
Requirement M4(1) does not apply to:
(a) an extension to a dwelling; or
(b) any part of a building that is used solely to enable the building or any service or fitting in the building to be inspected, repaired or maintained.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document M$req$, $req$architecture$req$),
  ($req$Sch.1-Part M#5$req$, $req$Sch.1-Part M$req$, $req$Schedule 1 Part M Access to and use of buildings$req$, null, $req$M4$req$, $req$M4(2) optional requirement Category 2- accessible and adaptable dwellings$req$, 5, 1500, $req$(1) Reasonable provision must be made for people to—
(a) gain access to; and
(b) use, the dwelling and its facilities.
(2) The provision made must be sufficient to—
(a) meet the needs of occupants with differing needs, including some older or disabled people; and
(b) to allow adaptation of the dwelling to meet the changing needs of occupants over time.
Optional requirement M4(2)—
(a) may apply only in relation to a dwelling that is erected;
(b) will apply in substitution for requirement M4(1);
(c) does not apply where optional requirement M4(3) applies;
(d) does not apply to any part of a building that is used solely to enable the building or any service or fitting in the building to be inspected, repaired or maintained.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document M$req$, $req$architecture$req$),
  ($req$Sch.1-Part M#6$req$, $req$Sch.1-Part M$req$, $req$Schedule 1 Part M Access to and use of buildings$req$, null, $req$M4$req$, $req$M4(3) optional requirement Category 3- wheelchair user dwellings$req$, 6, 1510, $req$(1) Reasonable provision must be made for people to—
(a) gain access to; and
(b) use, the dwelling and its facilities.
(2) The provision made must be sufficient to—
(a) allow simple adaptation of the dwelling to meet the needs of occupants who use wheelchairs; or
(b) meet the needs of occupants who use wheelchairs.
Optional requirement M4(3)—
(a) may apply only in relation to a dwelling that is erected;
(b) will apply in substitution for requirement M4(1);
(c) does not apply where optional requirement M4(2) applies;
(d) does not apply to any part of a building that is used solely to enable the building or any service or fitting in the building to be inspected, repaired or maintained.
Optional requirement M4(3)(2)(b) applies only where the planning permission under which the building work is carried out specifies that it shall be complied with.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document M$req$, $req$architecture$req$),
  ($req$Sch.1-Part O#1$req$, $req$Sch.1-Part O$req$, $req$Schedule 1 Part O Overheating$req$, null, $req$O1$req$, $req$O1 Overheating mitigation$req$, 1, 1520, $req$(1) Reasonable provision must be made in respect of a dwelling, institution or any other building containing one or more rooms for residential purposes, other than a room in a hotel (“residences”) to—
(a) limit unwanted solar gains in summer;$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document O$req$, null),
  ($req$Sch.1-Part O#2$req$, $req$Sch.1-Part O$req$, $req$Schedule 1 Part O Overheating$req$, null, $req$O1$req$, $req$O1 Overheating mitigation$req$, 2, 1530, $req$(b) provide an adequate means to remove heat from the indoor environment.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document O$req$, null),
  ($req$Sch.1-Part O#3$req$, $req$Sch.1-Part O$req$, $req$Schedule 1 Part O Overheating$req$, null, $req$O1$req$, $req$O1 Overheating mitigation$req$, 3, 1540, $req$(2) In meeting the obligations in paragraph (1)—
(a) account must be taken of the safety of any occupant, and their reasonable enjoyment of the residence; and
(b) mechanical cooling may only be used where insufficient heat is capable of being removed from the indoor environment without it.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document O$req$, null),
  ($req$Sch.1-Part P#1$req$, $req$Sch.1-Part P$req$, $req$Schedule 1 Part P Electrical safety$req$, null, $req$P1$req$, $req$P1 Design and installation$req$, 1, 1550, $req$Reasonable provision shall be made in the design and installation of electrical installations in order to protect persons operating, maintaining or altering the installations from fire or injury.
The requirements of this Part apply only to electrical installations that are intended to operate at low or extra-low voltage and are—
(a) in or attached to a dwelling;
(b) in the common parts of a building serving one or more dwellings, but excluding power supplies to lifts;
(c) in a building that receives its electricity from a source located within or shared with a dwelling; or
(d) in a garden or in or on land associated with a building where the electricity is from a source located within or shared with a dwelling.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document P$req$, $req$mep$req$),
  ($req$Sch.1-Part Q#1$req$, $req$Sch.1-Part Q$req$, $req$Schedule 1 Part Q Security$req$, null, $req$Q1$req$, $req$Q1 Unauthorised access$req$, 1, 1560, $req$Reasonable provision must be made to deter and] resist unauthorised access to—
(a) any dwelling; and
(b) any part of a building from which access can be gained to a flat within the building.
Requirement Q1 applies only in relation to new dwellings.Requirement Q1 applies only when a dwelling is erected.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document Q$req$, $req$architecture$req$),
  ($req$Sch.1-Part R#1$req$, $req$Sch.1-Part R$req$, $req$Schedule 1 Part R Physical infrastructure for electronic communications$req$, null, $req$RA1$req$, $req$RA1 Gigabit-ready physical infrastructure$req$, 1, 1570, $req$(1) ) Building work must be carried out so as to ensure 
that each dwelling is equipped with gigabit-ready 
physical infrastructure that extends from a network 
termination point for gigabit-capable public 
electronic communications networks and reaches—
(a) a distribution point, or
(b) where the person carrying out the building work 
(“the developer”) has no right to install gigabit_x0002_ready physical infrastructure in land in which it 
would have to be installed if it were to reach 
a distribution point, as close as is reasonably 
practicable to a distribution point, or$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Sch.1-Part R#2$req$, $req$Sch.1-Part R$req$, $req$Schedule 1 Part R Physical infrastructure for electronic communications$req$, null, $req$RA1$req$, $req$RA1 Gigabit-ready physical infrastructure$req$, 2, 1580, $req$(c) where the developer has no such right and 
requirement RA2 is excluded or modified by 
regulation 44ZC, and would be so excluded 
or modified even if the gigabit-ready physical 
infrastructure were required to reach as close as is 
reasonably practicable to a distribution point—
(i) as close as is reasonably practicable to a 
location at which a distribution point is likely 
to be installed within the relevant 2-year 
period (a “likely future location”), or
(ii) where there is no likely future location that 
is closer to the building than the closest 
distribution point already installed, an access 
point for gigabit-capable public electronic 
communications networks, or$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Sch.1-Part R#3$req$, $req$Sch.1-Part R$req$, $req$Schedule 1 Part R Physical infrastructure for electronic communications$req$, null, $req$RA1$req$, $req$RA1 Gigabit-ready physical infrastructure$req$, 3, 1590, $req$(d) where the developer has no right to install 
gigabit-ready physical infrastructure in land 
beyond the building, an access point for gigabit_x0002_capable public electronic communications 
networks.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Sch.1-Part R#4$req$, $req$Sch.1-Part R$req$, $req$Schedule 1 Part R Physical infrastructure for electronic communications$req$, null, $req$RA1$req$, $req$RA1 Gigabit-ready physical infrastructure$req$, 4, 1600, $req$(2) Where the work concerns a building containing more 
than one dwelling, the work must be carried out so 
as to ensure that the building is equipped in addition 
with a common access point for gigabit-capable 
public electronic communications networks.
(3) In this paragraph—
“distribution point” means a distribution point for a 
gigabit-capable public electronic communications 
network;
“the relevant 2-year period” means the period of 2 
years beginning with the earlier of the following—
(a) the day on which a building notice, initial notice or 
public body’s notice relating to work to which this 
paragraph applies is given;
(b) he day on which an application for building control approval with full plans relating to building work to which this paragraph applies is given.
Requirements RA1 and RA2 apply to the erection of 
a dwelling or of a building that contains one or more 
dwellings. 
Refer also to Regulation 44ZC$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Sch.1-Part R#5$req$, $req$Sch.1-Part R$req$, $req$Schedule 1 Part R Physical infrastructure for electronic communications$req$, null, $req$RA2$req$, $req$RA2 Connection to gigabit-capable network$req$, 5, 1610, $req$Each dwelling must in addition be provided with a 
connection to a gigabit-capable public electronic 
communications network.
Requirements RA1 and RA2 apply to the erection of a dwelling or of a building that contains one or more dwellings.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Sch.1-Part R#6$req$, $req$Sch.1-Part R$req$, $req$Schedule 1 Part R Physical infrastructure for electronic communications$req$, null, $req$R1$req$, $req$R1 High-speed ready in-building physical infrastructure$req$, 6, 1620, $req$(1) Building work must be carried out so as to ensure that the building is equipped with a high-speed ready in-building physical infrastructure, up to a network termination point for high-speed electronic communications networks.
(2) Where the work concerns a building containing more than one dwelling, the work must be carried out so as ensure that the building is equipped in addition with a common access point for high-speed electronic communications networks.
Requirement R1 applies, other than building work to which paragraph RA1 applies, to building work that consists of—
(a) the erection of a building; or
(b) major renovation works to a building$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document R$req$, $req$mep$req$),
  ($req$Sch.1-Part S#1$req$, $req$Sch.1-Part S$req$, $req$Schedule 1 Part S Infrastructure for the charging of electric vehicles$req$, null, $req$S1$req$, $req$S1 The erection of new residential buildings$req$, 1, 1630, $req$(1) A new residential building with associated parking must have access to electric vehicle charge points as provided for in paragraph (2).
(2) The number of associated parking spaces which have access to electric vehicle charge points must be—
(a) the total number of associated parking spaces, where there are fewer associated parking spaces than there are dwellings contained in the residential building; or
(b) the number of associated parking spaces that is equal to the total number of dwellings contained in the residential building, where there are the same number of associated parking spaces as, or more associated parking spaces than, there are dwellings.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Sch.1-Part S#2$req$, $req$Sch.1-Part S$req$, $req$Schedule 1 Part S Infrastructure for the charging of electric vehicles$req$, null, $req$S1$req$, $req$S1 The erection of new residential buildings$req$, 2, 1640, $req$(3) Cable routes for electric vehicle charge points must be installed in any associated parking spaces which do not, in accordance with paragraph (2), have an electric vehicle charge point where—
(a) a new residential building has more than 10 associated parking spaces; and
(b) there are more associated parking spaces than there are dwellings contained in the residential building.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Sch.1-Part S#3$req$, $req$Sch.1-Part S$req$, $req$Schedule 1 Part S Infrastructure for the charging of electric vehicles$req$, null, $req$S2$req$, $req$S2 Dwellings resulting from a material change of use$req$, 3, 1650, $req$Where one or more dwellings with associated parking result from a building, or a part of a building, undergoing a material change of use at least one associated parking space for the use of each such dwelling must have access to an electric vehicle charge point.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Sch.1-Part S#4$req$, $req$Sch.1-Part S$req$, $req$Schedule 1 Part S Infrastructure for the charging of electric vehicles$req$, null, $req$S3$req$, $req$S3 Residential buildings undergoing major renovation$req$, 4, 1660, $req$Where a residential building undergoing major renovation will have more than 10 associated parking spaces after the major renovation is completed—
(a) at least one associated parking space for the use of each dwelling must have access to an electric vehicle charge point;
(b) cable routes for electric vehicle charge points must be installed in all additional associated parking spaces.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Sch.1-Part S#5$req$, $req$Sch.1-Part S$req$, $req$Schedule 1 Part S Infrastructure for the charging of electric vehicles$req$, null, $req$S4$req$, $req$S4 Erection of new buildings which are not residential buildings or mixed-use buildings$req$, 5, 1670, $req$Where a new building which is not a residential building or a mixed-use building has more than 10 parking spaces—
(a) one of those parking spaces must have access to one electric vehicle charge point; and
(b) cable routes for electric vehicle charge points must be installed in a minimum of one fifth of the total number of remaining parking spaces.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Sch.1-Part S#6$req$, $req$Sch.1-Part S$req$, $req$Schedule 1 Part S Infrastructure for the charging of electric vehicles$req$, null, $req$S5$req$, $req$S5 Buildings undergoing major renovation which are not residential buildings or mixed-use buildings$req$, 6, 1680, $req$Where a building undergoing major renovation, which is not a residential building or a mixed-use building, will have more than 10 parking spaces after the major renovation is completed—
(a) one of those parking spaces must have access to one electric vehicle charge point; and
(b) cable routes for electric vehicle charge points must be installed in a minimum of one fifth of the total number of remaining parking spaces.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Sch.1-Part S#7$req$, $req$Sch.1-Part S$req$, $req$Schedule 1 Part S Infrastructure for the charging of electric vehicles$req$, null, $req$S6$req$, $req$S6 The erection of new mixed-use buildings and mixed-use buildings undergoing major renovation$req$, 7, 1690, $req$(1) The requirements of paragraph S1 apply in respect of the part of the new mixed-use building that contains one or more dwellings and the associated parking spaces that are assigned to those dwellings.
(2) The requirements of paragraph S3 apply in respect of the part of the mixed-use building that is undergoing major renovation that contains one or more dwellings and the associated parking spaces that are assigned to those dwellings.
(3) The requirements of paragraph S4 apply in respect of the part of the new mixed-use building that contains one or more new premises that are not dwellings and the parking spaces that are assigned to those premises.
(4) The requirements of paragraph S5 apply in respect of the part of the mixed-use building that is undergoing major renovation that contains one or more premises that are not dwellings and the parking spaces that are assigned to those premises.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document S$req$, $req$mep$req$),
  ($req$Sch.1-Part T#1$req$, $req$Sch.1-Part T$req$, $req$Schedule 1 Part T Toilet Accommodation$req$, null, $req$T1$req$, $req$T1 Toilet accommodation$req$, 1, 1700, $req$(1) Toilet accommodation in buildings other than dwellings—
(a) must consist of—
(i) reasonable provision for male and female single-sex toilets, or
(ii) where space precludes provision of single-sex toilets, universal toilets, and
(b) may consist of universal toilets in addition to single-sex toilets.
(2) In this requirement—
“single-sex toilet” means toilet facilities which— are intended for the exclusive use of persons of the same sex, and provide washbasins and hand-drying facilities in— either the toilet room or cubicle, or a separate area intended for use only by persons of that sex.
“universal toilet” means toilet facilities which— are provided in a fully enclosed room which contains a water-closet and washbasin and hand-drying facilities, and is intended for individual use by persons of either sex.
Requirement T1 does not apply to—
(a) en-suite facilities in individual rooms for residential purposes;
(b) residential rooms in care homes as defined at section 3 of the Care Standards Act 2000;
(c) schools as defined in section 4 of the Education Act 1996;
(d) premises, or part of any premises, used wholly or mainly for early years provision within the meaning of section 20 of the Childcare Act 2006 by an early years provider to whom section 40 of the Childcare Act 2006 (Duty to implement Early Years Foundation Stage) applies;
(e) cellular accommodation in custodial facilities.$req$, $req$https://www.legislation.gov.uk/uksi/2010/2214/schedule/1$req$, $req$Approved Document T$req$, $req$architecture$req$)
) as r(seed_id, sheet, section, heading, ref, provision, seq, sort_order, requirement_text, legislation_url, approved_document, default_discipline)
where v.label = 'England pre-FHBS';

-------------------------------------------------------------------------------
-- The working tracker for each project
-------------------------------------------------------------------------------

create type public.requirement_relevance as enum ('to_confirm', 'relevant', 'not_relevant');

-- The workbook's submission statuses ("Not relevant" is the relevance above).
create type public.requirement_status as enum (
  'not_started', 'design_in_progress', 'ready_for_submission', 'submitted_for_approval',
  'granted_conditional', 'granted'
);

create type public.compliance_route as enum (
  'approved_document', 'iso_en_bs', 'eurocode', 'engineered', 'performance_certified'
);

alter table public.projects add column catalogue_version_id uuid references public.catalogue_versions (id);

create table public.project_requirements (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  requirement_id      uuid not null references public.requirements (id),
  relevance           public.requirement_relevance not null default 'to_confirm',
  relevance_reason    text not null default '',
  relevance_by        uuid references auth.users (id),
  relevance_at        timestamptz,
  -- "Strategy (responsible party)" and the owner at each RIBA stage
  -- (stage 5, construction, usually the principal contractor).
  owner_member_id     uuid references public.project_members (id),
  stage2_member_id    uuid references public.project_members (id),
  stage3_member_id    uuid references public.project_members (id),
  stage4_member_id    uuid references public.project_members (id),
  stage5_member_id    uuid references public.project_members (id),
  route               public.compliance_route,
  guidance            text not null default '',
  -- The generic wording, and how it applies to THIS project (required
  -- before a row goes beyond "design in progress").
  standard_basis      text not null default '',
  project_application text not null default '',
  notes               text not null default '',
  status              public.requirement_status not null default 'not_started',
  action_text         text not null default '',
  action_member_id    uuid references public.project_members (id),
  action_due          date,
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users (id),
  unique (project_id, requirement_id)
);

create index project_requirements_project_idx on public.project_requirements (project_id);

alter table public.project_requirements enable row level security;

create policy "Members read their project's tracker"
  on public.project_requirements for select to authenticated
  using (public.is_aal2() and public.is_project_member(project_id));

-- Adds any missing rows for the project's catalogue version. Safe to re-run.
create function public.ensure_tracker(p_project_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.project_requirements (project_id, requirement_id)
  select p.id, r.id
  from public.projects p
  join public.requirements r on r.version_id = p.catalogue_version_id
  where p.id = p_project_id
  on conflict (project_id, requirement_id) do nothing;
$$;

-- New projects are pinned to the latest catalogue version.
create function public.projects_set_catalogue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.catalogue_version_id is null then
    select id into new.catalogue_version_id from public.catalogue_versions
    order by in_force_from desc nulls last, created_at desc limit 1;
  end if;
  return new;
end;
$$;

create trigger projects_set_catalogue
  before insert on public.projects
  for each row execute function public.projects_set_catalogue();

create function public.projects_create_tracker()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ensure_tracker(new.id);
  return null;
end;
$$;

create trigger projects_create_tracker
  after insert on public.projects
  for each row execute function public.projects_create_tracker();

-------------------------------------------------------------------------------
-- Who may do what
-------------------------------------------------------------------------------

-- The principal designer coordinates the tracker; so can the project owner.
create function public.is_tracker_coordinator(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and (
    public.is_project_owner(p_project_id)
    or public.my_member_in_role(p_project_id, 'principal_designer') is not null);
$$;

-- The caller is the row's responsible designer or owns one of its stages.
create function public.is_requirement_responsible(p_row public.project_requirements)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1 from public.project_members m
    where m.user_id = auth.uid() and m.removed_at is null and m.project_id = p_row.project_id
      and m.id in (p_row.owner_member_id, p_row.stage2_member_id, p_row.stage3_member_id,
                   p_row.stage4_member_id, p_row.stage5_member_id));
$$;

-- An active member of the project, or null.
create function public.assert_project_member_id(p_project_id uuid, p_member_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_member_id is null then
    return null;
  end if;
  if not exists (select 1 from public.project_members
                 where id = p_member_id and project_id = p_project_id and removed_at is null) then
    raise exception 'Choose someone on the project';
  end if;
  return p_member_id;
end;
$$;

-------------------------------------------------------------------------------
-- Coordinating (principal designer or owner)
-------------------------------------------------------------------------------

create function public.set_requirement_relevance(p_ids uuid[], p_relevance public.requirement_relevance, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_count   integer;
begin
  select min(project_id::text)::uuid into v_project from public.project_requirements where id = any (p_ids);
  if v_project is null then
    raise exception 'Nothing to update';
  end if;
  if (select count(distinct project_id) from public.project_requirements where id = any (p_ids)) > 1 then
    raise exception 'Rows must all be on one project';
  end if;
  if not public.is_tracker_coordinator(v_project) then
    raise exception 'Only the principal designer or the project owner decides relevance';
  end if;
  if p_relevance = 'not_relevant' and length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Give the reason it''s not relevant';
  end if;

  update public.project_requirements
  set relevance = p_relevance, relevance_reason = trim(coalesce(p_reason, '')),
      relevance_by = case when p_relevance = 'to_confirm' then null else auth.uid() end,
      relevance_at = case when p_relevance = 'to_confirm' then null else now() end,
      updated_at = now(), updated_by = auth.uid()
  where id = any (p_ids);
  get diagnostics v_count = row_count;

  perform public.write_project_audit(v_project, 'requirement.relevance', 'project', v_project::text,
    jsonb_build_object('rows', to_jsonb(p_ids), 'relevance', p_relevance, 'reason', trim(coalesce(p_reason, ''))));
  return v_count;
end;
$$;

create function public.assign_requirement(
  p_id uuid, p_owner uuid, p_stage2 uuid, p_stage3 uuid, p_stage4 uuid, p_stage5 uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.project_requirements;
begin
  select * into v_row from public.project_requirements where id = p_id;
  if not found or not public.is_tracker_coordinator(v_row.project_id) then
    raise exception 'Only the principal designer or the project owner assigns requirements';
  end if;
  update public.project_requirements
  set owner_member_id  = public.assert_project_member_id(v_row.project_id, p_owner),
      stage2_member_id = public.assert_project_member_id(v_row.project_id, p_stage2),
      stage3_member_id = public.assert_project_member_id(v_row.project_id, p_stage3),
      stage4_member_id = public.assert_project_member_id(v_row.project_id, p_stage4),
      stage5_member_id = public.assert_project_member_id(v_row.project_id, p_stage5),
      updated_at = now(), updated_by = auth.uid()
  where id = p_id;
  perform public.write_project_audit(v_row.project_id, 'requirement.assigned', 'project_requirement', p_id::text,
    jsonb_build_object('owner', p_owner, 'stage2', p_stage2, 'stage3', p_stage3, 'stage4', p_stage4, 'stage5', p_stage5));
end;
$$;

-- Fills in the responsible designer for unassigned rows from the default
-- discipline, where exactly one person on the team has that discipline.
-- Rows with no match are left for the principal designer.
create function public.assign_requirements_by_discipline(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.is_tracker_coordinator(p_project_id) then
    raise exception 'Only the principal designer or the project owner assigns requirements';
  end if;
  with only_one as (
    select discipline, min(id::text)::uuid as member_id
    from public.project_members
    where project_id = p_project_id and removed_at is null and discipline is not null
      and role in ('designer', 'principal_designer')
    group by discipline
    having count(*) = 1
  )
  update public.project_requirements pr
  set owner_member_id = o.member_id, updated_at = now(), updated_by = auth.uid()
  from public.requirements r, only_one o
  where pr.project_id = p_project_id and pr.owner_member_id is null and pr.relevance <> 'not_relevant'
    and r.id = pr.requirement_id and r.default_discipline = o.discipline;
  get diagnostics v_count = row_count;
  perform public.write_project_audit(p_project_id, 'requirement.assigned_by_discipline', 'project', p_project_id::text,
    jsonb_build_object('rows', v_count));
  return v_count;
end;
$$;

-------------------------------------------------------------------------------
-- Answering (the responsible designer)
-------------------------------------------------------------------------------

create function public.save_requirement_answer(
  p_id uuid, p_route public.compliance_route, p_guidance text, p_standard_basis text,
  p_project_application text, p_notes text, p_status public.requirement_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.project_requirements;
begin
  select * into v_row from public.project_requirements where id = p_id;
  if not found or not public.is_requirement_responsible(v_row) then
    raise exception 'Only the designer responsible for this requirement can write its answer';
  end if;
  if v_row.relevance = 'not_relevant' then
    raise exception 'This requirement has been marked not relevant';
  end if;
  if p_status not in ('not_started', 'design_in_progress')
     and length(trim(coalesce(p_project_application, ''))) = 0 then
    raise exception 'Say how this applies to this project before moving it beyond "design in progress"';
  end if;

  update public.project_requirements
  set route = p_route, guidance = coalesce(p_guidance, ''), standard_basis = coalesce(p_standard_basis, ''),
      project_application = coalesce(p_project_application, ''), notes = coalesce(p_notes, ''),
      status = p_status, updated_at = now(), updated_by = auth.uid()
  where id = p_id;

  perform public.write_project_audit(v_row.project_id, 'requirement.answered', 'project_requirement', p_id::text,
    jsonb_build_object('status', p_status, 'route', p_route,
      'project_application_sha256', public.sha256_hex(coalesce(p_project_application, '')),
      'standard_basis_sha256', public.sha256_hex(coalesce(p_standard_basis, ''))));
end;
$$;

-- The action required: the coordinator or the responsible designer.
create function public.set_requirement_action(p_id uuid, p_text text, p_member uuid, p_due date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.project_requirements;
begin
  select * into v_row from public.project_requirements where id = p_id;
  if not found or not (public.is_tracker_coordinator(v_row.project_id) or public.is_requirement_responsible(v_row)) then
    raise exception 'Only the principal designer or the responsible designer can set the action';
  end if;
  update public.project_requirements
  set action_text = coalesce(trim(p_text), ''), action_member_id = public.assert_project_member_id(v_row.project_id, p_member),
      action_due = p_due, updated_at = now(), updated_by = auth.uid()
  where id = p_id;
  perform public.write_project_audit(v_row.project_id, 'requirement.action', 'project_requirement', p_id::text,
    jsonb_build_object('text', coalesce(trim(p_text), ''), 'member', p_member, 'due', p_due));
end;
$$;

-------------------------------------------------------------------------------
-- Existing projects
-------------------------------------------------------------------------------

update public.projects set catalogue_version_id = (select id from public.catalogue_versions where label = 'England pre-FHBS')
where catalogue_version_id is null;

do $$
declare
  v_id uuid;
begin
  for v_id in select id from public.projects loop
    perform public.ensure_tracker(v_id);
  end loop;
end;
$$;

-------------------------------------------------------------------------------
-- Permissions
-------------------------------------------------------------------------------

revoke all on public.catalogue_versions, public.requirements, public.project_requirements from anon, authenticated;
grant select on public.catalogue_versions, public.requirements, public.project_requirements to authenticated;

revoke execute on function
  public.ensure_tracker(uuid),
  public.projects_set_catalogue(),
  public.projects_create_tracker(),
  public.is_tracker_coordinator(uuid),
  public.is_requirement_responsible(public.project_requirements),
  public.assert_project_member_id(uuid, uuid),
  public.set_requirement_relevance(uuid[], public.requirement_relevance, text),
  public.assign_requirement(uuid, uuid, uuid, uuid, uuid, uuid),
  public.assign_requirements_by_discipline(uuid),
  public.save_requirement_answer(uuid, public.compliance_route, text, text, text, text, public.requirement_status),
  public.set_requirement_action(uuid, text, uuid, date)
from public, anon, authenticated;

grant execute on function
  public.is_tracker_coordinator(uuid),
  public.set_requirement_relevance(uuid[], public.requirement_relevance, text),
  public.assign_requirement(uuid, uuid, uuid, uuid, uuid, uuid),
  public.assign_requirements_by_discipline(uuid),
  public.save_requirement_answer(uuid, public.compliance_route, text, text, text, text, public.requirement_status),
  public.set_requirement_action(uuid, text, uuid, date)
to authenticated;
