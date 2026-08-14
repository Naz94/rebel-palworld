-- ============================================================
-- Rebel Palworld
-- Trusted backend permissions
--
-- service_role is used only by the Rebel Palworld API.
-- Browser clients never receive this credential.
-- ============================================================

grant select, insert, update, delete
on table public.servers
to service_role;

grant select, insert, update, delete
on table public.connectors
to service_role;

grant select, insert, update, delete
on table public.connector_credentials
to service_role;

grant select, insert, update, delete
on table public.server_telemetry
to service_role;

grant usage, select
on sequence public.server_telemetry_id_seq
to service_role;