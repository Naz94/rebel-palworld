-- ============================================================
-- Rebel Palworld
-- Initial database schema
--
-- Security principles:
--   1. auth.users is the source of identity.
--   2. profiles mirrors the authenticated user.
--   3. Every customer-owned table contains owner_id.
--   4. Row Level Security is enabled on every customer table.
--   5. Clients can only access rows belonging to auth.uid().
-- ============================================================


-- ============================================================
-- 1. PROFILES
-- ============================================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. SERVERS
-- ============================================================

create table public.servers (
    id uuid primary key default gen_random_uuid(),

    owner_id uuid not null
        references public.profiles(id)
        on delete cascade,

    name text not null,
    server_type text not null,

    status text not null default 'unknown',

    last_seen_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint servers_name_length
        check (char_length(name) between 1 and 100),

    constraint servers_type_valid
        check (server_type in (
            'pc',
            'dedicated',
            'game_host',
            'vps'
        )),

    constraint servers_status_valid
        check (status in (
            'unknown',
            'online',
            'offline',
            'error'
        ))
);


-- ============================================================
-- 3. CONNECTORS
-- ============================================================

create table public.connectors (
    id uuid primary key default gen_random_uuid(),

    server_id uuid not null unique
        references public.servers(id)
        on delete cascade,

    status text not null default 'offline',

    version text,

    last_heartbeat_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint connectors_status_valid
        check (status in (
            'online',
            'offline',
            'error'
        ))
);


-- ============================================================
-- 4. SERVER EVENTS
-- ============================================================

create table public.server_events (
    id bigint generated always as identity primary key,

    server_id uuid not null
        references public.servers(id)
        on delete cascade,

    event_type text not null,

    payload jsonb not null default '{}'::jsonb,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 5. PAL BUILDS
-- ============================================================

create table public.pal_builds (
    id uuid primary key default gen_random_uuid(),

    owner_id uuid not null
        references public.profiles(id)
        on delete cascade,

    name text not null,

    pal_species text not null,

    role text,

    build_type text,

    traits jsonb not null default '[]'::jsonb,

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint pal_builds_name_length
        check (char_length(name) between 1 and 100)
);


-- ============================================================
-- 6. BREEDING PLANS
-- ============================================================

create table public.breeding_plans (
    id uuid primary key default gen_random_uuid(),

    owner_id uuid not null
        references public.profiles(id)
        on delete cascade,

    name text,

    parent_a text not null,
    parent_b text not null,

    target_pal text,

    notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- 7. INDEXES
-- ============================================================

create index servers_owner_id_idx
    on public.servers(owner_id);

create index connectors_server_id_idx
    on public.connectors(server_id);

create index server_events_server_id_created_at_idx
    on public.server_events(server_id, created_at desc);

create index pal_builds_owner_id_idx
    on public.pal_builds(owner_id);

create index breeding_plans_owner_id_idx
    on public.breeding_plans(owner_id);


-- ============================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.servers enable row level security;
alter table public.connectors enable row level security;
alter table public.server_events enable row level security;
alter table public.pal_builds enable row level security;
alter table public.breeding_plans enable row level security;


-- ============================================================
-- 9. PROFILE POLICIES
-- ============================================================

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));


create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));


-- ============================================================
-- 10. SERVER POLICIES
-- ============================================================

create policy "servers_select_own"
on public.servers
for select
to authenticated
using (owner_id = (select auth.uid()));


create policy "servers_insert_own"
on public.servers
for insert
to authenticated
with check (owner_id = (select auth.uid()));


create policy "servers_update_own"
on public.servers
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));


create policy "servers_delete_own"
on public.servers
for delete
to authenticated
using (owner_id = (select auth.uid()));


-- ============================================================
-- 11. CONNECTOR POLICIES
-- ============================================================

create policy "connectors_select_own"
on public.connectors
for select
to authenticated
using (
    exists (
        select 1
        from public.servers
        where servers.id = connectors.server_id
          and servers.owner_id = (select auth.uid())
    )
);


create policy "connectors_insert_own"
on public.connectors
for insert
to authenticated
with check (
    exists (
        select 1
        from public.servers
        where servers.id = connectors.server_id
          and servers.owner_id = (select auth.uid())
    )
);


create policy "connectors_update_own"
on public.connectors
for update
to authenticated
using (
    exists (
        select 1
        from public.servers
        where servers.id = connectors.server_id
          and servers.owner_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.servers
        where servers.id = connectors.server_id
          and servers.owner_id = (select auth.uid())
    )
);


create policy "connectors_delete_own"
on public.connectors
for delete
to authenticated
using (
    exists (
        select 1
        from public.servers
        where servers.id = connectors.server_id
          and servers.owner_id = (select auth.uid())
    )
);


-- ============================================================
-- 12. SERVER EVENT POLICIES
-- ============================================================

create policy "server_events_select_own"
on public.server_events
for select
to authenticated
using (
    exists (
        select 1
        from public.servers
        where servers.id = server_events.server_id
          and servers.owner_id = (select auth.uid())
    )
);


-- ============================================================
-- 13. PAL BUILD POLICIES
-- ============================================================

create policy "pal_builds_select_own"
on public.pal_builds
for select
to authenticated
using (owner_id = (select auth.uid()));


create policy "pal_builds_insert_own"
on public.pal_builds
for insert
to authenticated
with check (owner_id = (select auth.uid()));


create policy "pal_builds_update_own"
on public.pal_builds
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));


create policy "pal_builds_delete_own"
on public.pal_builds
for delete
to authenticated
using (owner_id = (select auth.uid()));


-- ============================================================
-- 14. BREEDING PLAN POLICIES
-- ============================================================

create policy "breeding_plans_select_own"
on public.breeding_plans
for select
to authenticated
using (owner_id = (select auth.uid()));


create policy "breeding_plans_insert_own"
on public.breeding_plans
for insert
to authenticated
with check (owner_id = (select auth.uid()));


create policy "breeding_plans_update_own"
on public.breeding_plans
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));


create policy "breeding_plans_delete_own"
on public.breeding_plans
for delete
to authenticated
using (owner_id = (select auth.uid()));


-- ============================================================
-- END INITIAL SCHEMA
-- ============================================================