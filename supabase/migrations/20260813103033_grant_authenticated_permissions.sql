-- ============================================================
-- Rebel Palworld
-- Authenticated role permissions
--
-- GRANT controls whether authenticated users may attempt these
-- operations. Row Level Security then controls WHICH rows each
-- authenticated user may access.
-- ============================================================

grant select, update
on table public.profiles
to authenticated;

grant select, insert, update, delete
on table public.servers
to authenticated;

grant select, insert, update, delete
on table public.connectors
to authenticated;

grant select
on table public.server_events
to authenticated;

grant select, insert, update, delete
on table public.pal_builds
to authenticated;

grant select, insert, update, delete
on table public.breeding_plans
to authenticated;