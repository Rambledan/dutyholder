-- Phase 1: invite-only sign-up, profiles, TOTP recovery codes and the audit log.
--
-- Security model:
--   * Every table has Row Level Security (RLS) switched on. With RLS on and
--     no policy, nobody can read or write the table through the API.
--   * The only policy in this phase lets a user read and edit their OWN
--     profile, and only once they have passed two-factor (aal2). Policies
--     that open data to project teammates arrive with projects in phase 2.
--   * invites, mfa_recovery_codes and audit_log have no policies at all.
--     They are reached only through the SECURITY DEFINER functions below,
--     which check who is calling and what they are allowed to do.

-------------------------------------------------------------------------------
-- Helpers
-------------------------------------------------------------------------------

-- True when the caller's session has passed two-factor authentication.
create function public.is_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

-- Lower-case hex SHA-256 of a string. Used to store tokens and codes so the
-- database never holds the plain value.
create function public.sha256_hex(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(pg_catalog.sha256(convert_to(p_value, 'UTF8')), 'hex');
$$;

-- The caller's IP address, as forwarded by the Supabase API gateway.
create function public.request_ip()
returns inet
language plpgsql
stable
set search_path = ''
as $$
declare
  v_forwarded text;
begin
  v_forwarded := current_setting('request.headers', true)::json ->> 'x-forwarded-for';
  return trim(split_part(v_forwarded, ',', 1))::inet;
exception when others then
  return null;
end;
$$;

-------------------------------------------------------------------------------
-- Audit log (append-only)
-------------------------------------------------------------------------------

create table public.audit_log (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid,                -- auth user who did it (null = system)
  action      text not null,       -- e.g. 'auth.signed_up', 'mfa.enrolled'
  entity_type text not null,       -- e.g. 'profile', 'invite'
  entity_id   text,
  project_id  uuid,                -- filled in from phase 2 onwards
  details     jsonb not null default '{}'::jsonb,
  ip_address  inet
);

create index audit_log_actor_idx on public.audit_log (actor_id, occurred_at desc);
create index audit_log_project_idx on public.audit_log (project_id, occurred_at desc);

alter table public.audit_log enable row level security;
-- Nobody reads or writes it through the API in phase 1. Phase 2 adds a
-- read-only policy for project owners.
revoke all on public.audit_log from anon, authenticated;

-- Refuse every UPDATE, DELETE and TRUNCATE, even from the table owner.
create function public.audit_log_block_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;

create trigger audit_log_no_update_delete
  before update or delete on public.audit_log
  for each row execute function public.audit_log_block_changes();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public.audit_log_block_changes();

-- Internal: write one audit entry. Not callable through the API; only other
-- functions in this file call it.
create function public.write_audit(
  p_action      text,
  p_entity_type text,
  p_entity_id   text,
  p_details     jsonb default '{}'::jsonb,
  p_actor_id    uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, details, ip_address)
  values (coalesce(p_actor_id, auth.uid()), p_action, p_entity_type, p_entity_id,
          coalesce(p_details, '{}'::jsonb), public.request_ip());
$$;

-------------------------------------------------------------------------------
-- Profiles
-------------------------------------------------------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null default '',
  company    text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users read their own profile after 2FA"
  on public.profiles for select
  to authenticated
  using (public.is_aal2() and id = auth.uid());

create policy "Users update their own profile after 2FA"
  on public.profiles for update
  to authenticated
  using (public.is_aal2() and id = auth.uid())
  with check (public.is_aal2() and id = auth.uid());

-- Rows are created only by the sign-up trigger, never directly.
revoke all on public.profiles from anon;
revoke insert, delete, truncate, references, trigger on public.profiles from authenticated;
-- Users may change their name, company and phone, nothing else.
revoke update on public.profiles from authenticated;
grant update (full_name, company, phone) on public.profiles to authenticated;

create function public.profiles_on_update()
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
      'before', jsonb_build_object('full_name', old.full_name, 'company', old.company, 'phone', old.phone),
      'after',  jsonb_build_object('full_name', new.full_name, 'company', new.company, 'phone', new.phone)
    )
  );
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_on_update();

-------------------------------------------------------------------------------
-- Invites (single-use, expire after 7 days)
-------------------------------------------------------------------------------

create table public.invites (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  token_hash text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz,
  used_by    uuid references auth.users (id) on delete set null
);

create index invites_email_idx on public.invites (lower(email));

alter table public.invites enable row level security;
revoke all on public.invites from anon, authenticated;

-- Create an invite and return the secret token (shown once, never stored).
-- In phase 1 this is run by hand in the Supabase SQL editor. Phase 3 will
-- call it from the "invite team member" screen.
create function public.create_invite(p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_id    uuid;
begin
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email address is required';
  end if;

  -- Two random UUIDs give 244 bits of randomness from a secure generator.
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  insert into public.invites (email, token_hash, created_by)
  values (lower(trim(p_email)), public.sha256_hex(v_token), auth.uid())
  returning id into v_id;

  perform public.write_audit('invite.created', 'invite', v_id::text,
                             jsonb_build_object('email', lower(trim(p_email))));
  return v_token;
end;
$$;

-- Used by the sign-up page: returns the invited email if the token is valid,
-- otherwise null. Reveals nothing about other invites.
create function public.check_invite(p_token text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select email
  from public.invites
  where token_hash = public.sha256_hex(p_token)
    and used_at is null
    and expires_at > now();
$$;

-------------------------------------------------------------------------------
-- Sign-up gate: every new auth user must present a valid invite
-------------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token  text := new.raw_user_meta_data ->> 'invite_token';
  v_invite public.invites%rowtype;
begin
  if v_token is null then
    raise exception 'Sign-up requires an invite';
  end if;

  select * into v_invite
  from public.invites
  where token_hash = public.sha256_hex(v_token)
    and lower(email) = lower(new.email)
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'This invite is invalid, expired or already used';
  end if;

  update public.invites
  set used_at = now(), used_by = new.id
  where id = v_invite.id;

  insert into public.profiles (id, full_name)
  values (new.id, coalesce(trim(new.raw_user_meta_data ->> 'full_name'), ''));

  -- The token has done its job; don't leave it in the user's metadata.
  update auth.users
  set raw_user_meta_data = raw_user_meta_data - 'invite_token'
  where id = new.id;

  perform public.write_audit('auth.signed_up', 'profile', new.id::text,
                             jsonb_build_object('invite_id', v_invite.id, 'email', new.email),
                             new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-------------------------------------------------------------------------------
-- Two-factor: enrolment record and recovery codes
-------------------------------------------------------------------------------

create table public.mfa_recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code_hash  text not null,
  created_at timestamptz not null default now(),
  used_at    timestamptz
);

create index mfa_recovery_codes_user_idx on public.mfa_recovery_codes (user_id);

alter table public.mfa_recovery_codes enable row level security;
revoke all on public.mfa_recovery_codes from anon, authenticated;

-- Normalise a recovery code the way the user might type it.
create function public.normalise_recovery_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(coalesce(p_code, ''), '[^0-9a-fA-F]', '', 'g'));
$$;

-- Called once the user has scanned the QR code and entered their first code.
create function public.record_mfa_enrolled()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;
  perform public.write_audit('mfa.enrolled', 'profile', auth.uid()::text);
end;
$$;

-- Issue 10 fresh recovery codes (replacing any old ones) and return them.
-- They are shown to the user once; only their hashes are kept.
create function public.generate_recovery_codes()
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_hex  text;
begin
  if auth.uid() is null or not public.is_aal2() then
    raise exception 'Two-factor verification required';
  end if;

  delete from public.mfa_recovery_codes where user_id = auth.uid();

  for i in 1..10 loop
    v_hex  := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    v_code := substr(v_hex, 1, 4) || '-' || substr(v_hex, 5, 4) || '-' || substr(v_hex, 9, 4);
    insert into public.mfa_recovery_codes (user_id, code_hash)
    values (auth.uid(), public.sha256_hex(v_hex));
    return next v_code;
  end loop;

  perform public.write_audit('mfa.recovery_codes_generated', 'profile', auth.uid()::text);
end;
$$;

create function public.recovery_codes_remaining()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_aal2() then
    (select count(*)::integer from public.mfa_recovery_codes
     where user_id = auth.uid() and used_at is null)
  end;
$$;

-- Lost phone: a signed-in (password-only) user swaps one recovery code for a
-- reset of their authenticator. They must then set up a new one.
-- Returns false for a wrong code. Locks out after 5 wrong codes in 15 minutes.
create function public.use_recovery_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_failures integer;
  v_code_id  uuid;
begin
  if v_uid is null then
    raise exception 'Sign in with your password first';
  end if;

  select count(*) into v_failures
  from public.audit_log
  where actor_id = v_uid
    and action = 'mfa.recovery_code_failed'
    and occurred_at > now() - interval '15 minutes';

  if v_failures >= 5 then
    perform public.write_audit('mfa.recovery_code_locked_out', 'profile', v_uid::text);
    return false;
  end if;

  select id into v_code_id
  from public.mfa_recovery_codes
  where user_id = v_uid
    and used_at is null
    and code_hash = public.sha256_hex(public.normalise_recovery_code(p_code))
  for update;

  if v_code_id is null then
    perform public.write_audit('mfa.recovery_code_failed', 'profile', v_uid::text);
    return false;
  end if;

  update public.mfa_recovery_codes set used_at = now() where id = v_code_id;
  delete from auth.mfa_factors where user_id = v_uid;

  perform public.write_audit('mfa.recovery_code_used', 'profile', v_uid::text,
                             jsonb_build_object('recovery_code_id', v_code_id));
  return true;
end;
$$;

-------------------------------------------------------------------------------
-- Who may call which function
-------------------------------------------------------------------------------

-- Supabase lets everyone run new functions by default. Lock them all down,
-- then open up only the ones the app needs.
revoke execute on function
  public.is_aal2(),
  public.sha256_hex(text),
  public.request_ip(),
  public.audit_log_block_changes(),
  public.write_audit(text, text, text, jsonb, uuid),
  public.profiles_on_update(),
  public.create_invite(text),
  public.check_invite(text),
  public.handle_new_user(),
  public.normalise_recovery_code(text),
  public.record_mfa_enrolled(),
  public.generate_recovery_codes(),
  public.recovery_codes_remaining(),
  public.use_recovery_code(text)
from public, anon, authenticated;

-- is_aal2 is used inside RLS policies, so signed-in users must be able to run it.
grant execute on function public.is_aal2() to authenticated;
grant execute on function public.check_invite(text) to anon, authenticated;
grant execute on function
  public.record_mfa_enrolled(),
  public.generate_recovery_codes(),
  public.recovery_codes_remaining(),
  public.use_recovery_code(text)
to authenticated;
