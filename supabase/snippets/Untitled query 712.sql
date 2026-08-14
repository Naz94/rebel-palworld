select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'connector_credentials'
  and grantee = 'service_role'
order by privilege_type;