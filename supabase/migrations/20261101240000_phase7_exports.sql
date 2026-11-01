-- Phase 7: evidence pack exports.
--
--   * exports: one row per evidence pack. The owner requests it
--     (request_export); the export job (service role) builds the zip,
--     stores it in the private "exports" bucket and records the result
--     (finish_export). Packs expire 24 hours after they're ready.
--   * Only the project owner can see their project's exports, and can only
--     open a pack file while it hasn't expired. Every download is logged.

create table public.exports (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  requested_by uuid not null references auth.users (id),
  status       text not null default 'queued' check (status in ('queued', 'building', 'ready', 'failed')),
  storage_path text unique,
  file_name    text,
  size_bytes   bigint,
  sha256       text,
  file_count   integer,
  warnings     integer not null default 0,  -- e.g. evidence fingerprint mismatches
  error        text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  expires_at   timestamptz
);

create index exports_project_idx on public.exports (project_id, created_at desc);

alter table public.exports enable row level security;

create trigger exports_no_delete
  before delete on public.exports
  for each row execute function public.block_changes();

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false);

create policy "Owners read their project's exports"
  on public.exports for select to authenticated
  using (public.is_aal2() and public.is_project_owner(project_id));

-- The owner may open (sign a link to) a pack file only while it's live.
create policy "Owners read live export files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exports' and public.is_aal2()
    and exists (
      select 1 from public.exports e
      where e.storage_path = name and e.status = 'ready' and e.expires_at > now()
        and public.is_project_owner(e.project_id)
    )
  );

-- Owner asks for a new pack. At most one being built at a time.
create function public.request_export(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'Only the project owner can export the evidence pack';
  end if;
  if exists (select 1 from public.exports
             where project_id = p_project_id and status in ('queued', 'building')
               and created_at > now() - interval '15 minutes') then
    raise exception 'An evidence pack is already being built';
  end if;

  insert into public.exports (project_id, requested_by) values (p_project_id, auth.uid()) returning id into v_id;
  perform public.write_project_audit(p_project_id, 'export.requested', 'export', v_id::text, '{}'::jsonb);
  return v_id;
end;
$$;

-- The export job records progress and the result (service role only).
create function public.finish_export(
  p_export_id  uuid,
  p_status     text,
  p_path       text,
  p_file_name  text,
  p_size       bigint,
  p_sha256     text,
  p_file_count integer,
  p_warnings   integer,
  p_error      text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_e public.exports;
begin
  update public.exports
  set status = p_status,
      storage_path = coalesce(p_path, storage_path),
      file_name = coalesce(p_file_name, file_name),
      size_bytes = coalesce(p_size, size_bytes),
      sha256 = coalesce(p_sha256, sha256),
      file_count = coalesce(p_file_count, file_count),
      warnings = coalesce(p_warnings, warnings),
      error = left(p_error, 1000),
      completed_at = case when p_status in ('ready', 'failed') then now() else completed_at end,
      expires_at = case when p_status = 'ready' then now() + interval '24 hours' else expires_at end
  where id = p_export_id
  returning * into v_e;

  if v_e.id is not null and p_status in ('ready', 'failed') then
    insert into public.audit_log (actor_id, action, entity_type, entity_id, project_id, details)
    values (null, 'export.' || p_status, 'export', v_e.id::text, v_e.project_id,
            jsonb_build_object('sha256', v_e.sha256, 'files', v_e.file_count, 'size_bytes', v_e.size_bytes,
                               'warnings', v_e.warnings, 'error', v_e.error));
  end if;
end;
$$;

-- Logged each time the owner downloads a pack.
create function public.record_export_download(p_export_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_e public.exports;
begin
  select * into v_e from public.exports where id = p_export_id;
  if not found or not public.is_project_owner(v_e.project_id) then
    raise exception 'Not found';
  end if;
  if v_e.status <> 'ready' or v_e.expires_at <= now() then
    raise exception 'This evidence pack has expired; create a new one';
  end if;
  perform public.write_project_audit(v_e.project_id, 'export.downloaded', 'export', v_e.id::text,
    jsonb_build_object('sha256', v_e.sha256));
end;
$$;

revoke all on public.exports from anon, authenticated;
grant select on public.exports to authenticated;

revoke execute on function
  public.request_export(uuid),
  public.finish_export(uuid, text, text, text, bigint, text, integer, integer, text),
  public.record_export_download(uuid)
from public, anon, authenticated;

grant execute on function public.request_export(uuid), public.record_export_download(uuid) to authenticated;
grant execute on function public.finish_export(uuid, text, text, text, bigint, text, integer, integer, text) to service_role;
