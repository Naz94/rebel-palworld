-- ============================================================
-- Rebel Palworld
-- Connector authentication
--
-- Connector secrets are kept in a separate private table.
-- Browser users must never be able to read credential hashes.
-- ============================================================


create table public.connector_credentials (
    connector_id uuid primary key
        references public.connectors(id)
        on delete cascade,

    token_hash text not null unique,

    created_at timestamptz not null default now(),
    rotated_at timestamptz,
    revoked_at timestamptz,

    constraint connector_credentials_token_hash_valid
        check (char_length(token_hash) = 64)
);


-- No browser/client access.
alter table public.connector_credentials
enable row level security;


revoke all
on table public.connector_credentials
from anon, authenticated;


create index connector_credentials_active_token_idx
    on public.connector_credentials(token_hash)
    where revoked_at is null;