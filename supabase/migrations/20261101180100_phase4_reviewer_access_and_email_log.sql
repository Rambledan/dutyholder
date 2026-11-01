-- Phase 4 (follow-up):
--   * Reviewers (owner or whoever holds a CL-11E-REVIEW-* item) can see every
--     member's competence item on their project, so they know what to review.
--   * record_email(): logs each notification email (sent or not) in the
--     audit trail, as CLAUDE.md requires for every send.

create policy "Reviewers read competence items"
  on public.checklist_items for select to authenticated
  using (
    public.is_aal2()
    and template_code = 'ALL-11F-COMPETENCE'
    and public.is_project_reviewer(project_id)
  );

create function public.record_email(
  p_project_id uuid,
  p_member_id  uuid,
  p_kind       text,
  p_sent       boolean,
  p_detail     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'Not a member of this project';
  end if;
  perform public.write_project_audit(p_project_id,
    case when p_sent then 'email.sent' else 'email.not_sent' end,
    'project_member', p_member_id::text,
    jsonb_build_object('kind', left(p_kind, 60), 'detail', left(p_detail, 500)));
end;
$$;

revoke execute on function public.record_email(uuid, uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.record_email(uuid, uuid, text, boolean, text) to authenticated;
