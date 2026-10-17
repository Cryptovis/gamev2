-- Rule of Nations, Phase 9.9: cloud saves.
--
-- One row per campaign per guest profile. A profile is identified by a random sync key that only the player's devices
-- know; the table stores the SHA-256 of that key (owner_key), never the key itself. The client sends the key in the
-- x-ron-sync-key request header and the policies below only let a request touch rows whose owner_key matches it, so no
-- Supabase account is needed and one profile cannot read another's saves.
--
-- The envelope column holds the sealed campaign (JSON; the payload inside is gzip-compressed and, if the player set a
-- passphrase, AES-GCM encrypted in the browser, so the server never sees an encrypted save in the clear).

create table if not exists public.ron_cloud_saves (
  owner_key      text        not null check (owner_key ~ '^[0-9a-f]{64}$'),
  campaign_id    text        not null check (char_length(campaign_id) between 1 and 80),
  revision       integer     not null check (revision >= 1),
  device_id      text        not null check (char_length(device_id) between 1 and 64),
  updated_at     timestamptz not null default now(),
  day            integer     not null check (day >= 0),
  schema_version integer     not null,
  bytes          integer     not null check (bytes >= 0 and bytes <= 67108864),
  checksum       text        not null check (checksum ~ '^[0-9a-f]{64}$'),
  summary        jsonb       not null,
  envelope       jsonb       not null,
  primary key (owner_key, campaign_id)
);

create index if not exists ron_cloud_saves_owner_updated on public.ron_cloud_saves (owner_key, updated_at desc);

alter table public.ron_cloud_saves enable row level security;

-- The sync key the request presented, hashed the same way the client hashes it.
create or replace function public.ron_request_owner_key() returns text
language sql stable as $$
  select encode(
    sha256(convert_to(coalesce(current_setting('request.headers', true)::json ->> 'x-ron-sync-key', ''), 'utf8')),
    'hex')
$$;

drop policy if exists ron_cloud_saves_select on public.ron_cloud_saves;
drop policy if exists ron_cloud_saves_insert on public.ron_cloud_saves;
drop policy if exists ron_cloud_saves_update on public.ron_cloud_saves;
drop policy if exists ron_cloud_saves_delete on public.ron_cloud_saves;

create policy ron_cloud_saves_select on public.ron_cloud_saves for select to anon
  using (owner_key = public.ron_request_owner_key());
create policy ron_cloud_saves_insert on public.ron_cloud_saves for insert to anon
  with check (owner_key = public.ron_request_owner_key());
create policy ron_cloud_saves_update on public.ron_cloud_saves for update to anon
  using (owner_key = public.ron_request_owner_key())
  with check (owner_key = public.ron_request_owner_key());
create policy ron_cloud_saves_delete on public.ron_cloud_saves for delete to anon
  using (owner_key = public.ron_request_owner_key());

grant select, insert, update, delete on public.ron_cloud_saves to anon;
