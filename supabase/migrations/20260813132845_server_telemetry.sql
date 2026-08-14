-- ============================================================
-- Rebel Palworld
-- Server telemetry
-- ============================================================

create table public.server_telemetry (
    id bigint generated always as identity primary key,

    server_id uuid not null
        references public.servers(id)
        on delete cascade,

    server_fps real,
    server_frame_time real,

    players_online integer,
    max_players integer,

    uptime_seconds bigint,

    base_count integer,
    in_game_day integer,

    server_version text,
    world_guid text,

    created_at timestamptz not null default now(),

    constraint server_telemetry_players_online_valid
        check (
            players_online is null
            or players_online >= 0
        ),

    constraint server_telemetry_max_players_valid
        check (
            max_players is null
            or max_players >= 0
        ),

    constraint server_telemetry_uptime_valid
        check (
            uptime_seconds is null
            or uptime_seconds >= 0
        )
);


create index server_telemetry_server_id_created_at_idx
    on public.server_telemetry(
        server_id,
        created_at desc
    );


alter table public.server_telemetry
enable row level security;


create policy "server_telemetry_select_own"
on public.server_telemetry
for select
to authenticated
using (
    exists (
        select 1
        from public.servers
        where servers.id = server_telemetry.server_id
          and servers.owner_id = (select auth.uid())
    )
);


grant select
on table public.server_telemetry
to authenticated;