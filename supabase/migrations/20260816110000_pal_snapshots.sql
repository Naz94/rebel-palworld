-- ============================================================
-- Rebel Palworld Cloud Snapshot V1
--
-- Stores only processed Rebel application data. Raw Level.sav
-- files are never uploaded or persisted by this feature.
-- ============================================================

create table public.pal_snapshots (
    server_id uuid primary key
        references public.servers(id)
        on delete cascade,

    connector_id uuid not null
        references public.connectors(id)
        on delete cascade,

    schema_version integer not null default 1,

    entities jsonb not null,
    watcher jsonb not null default '{}'::jsonb,

    pal_count integer not null default 0,
    world_id text,
    save_signature text,
    save_modified_at timestamptz,
    synced_at timestamptz not null default now(),

    constraint pal_snapshots_schema_version_valid
        check (schema_version >= 1),

    constraint pal_snapshots_entities_array
        check (jsonb_typeof(entities) = 'array'),

    constraint pal_snapshots_pal_count_valid
        check (pal_count >= 0)
);

create index pal_snapshots_connector_id_idx
    on public.pal_snapshots(connector_id);

create index pal_snapshots_synced_at_idx
    on public.pal_snapshots(synced_at desc);

alter table public.pal_snapshots
enable row level security;

create policy "pal_snapshots_select_own"
on public.pal_snapshots
for select
to authenticated
using (
    exists (
        select 1
        from public.servers
        where servers.id = pal_snapshots.server_id
          and servers.owner_id = (select auth.uid())
    )
);

revoke all
on table public.pal_snapshots
from anon;

grant select
on table public.pal_snapshots
to authenticated;

grant select, insert, update, delete
on table public.pal_snapshots
to service_role;
