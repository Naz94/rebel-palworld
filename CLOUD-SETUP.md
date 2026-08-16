# Rebel Palworld Cloud Hosting V1

Rebel Cloud stores processed application snapshots only. It never uploads the raw Palworld `Level.sav`.

## Architecture

- Vercel hosts the Next.js web application and authenticated snapshot API.
- Supabase Auth protects the dashboard.
- Supabase Postgres stores one latest processed snapshot per connected server.
- The local read-only watcher uploads a snapshot only after local save processing succeeds.
- When the PC is offline, the hosted site continues showing the last successful snapshot.

## Vercel environment variables

Configure these in the Vercel project:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Never prefix it with `NEXT_PUBLIC_` and never place it in Git.

Connector provisioning and snapshot uploads are hosted directly by the Next.js application, so no separate API deployment is required.

## Database

Apply all Supabase migrations, including:

```text
supabase/migrations/20260816110000_pal_snapshots.sql
```

The snapshot table has Row Level Security. Signed-in users can only read snapshots belonging to their own server rows.

## Local connector setup

1. Sign in to the hosted Rebel dashboard.
2. Add the PC/server if it does not already exist.
3. Use **Connect Server** to create a one-time connector token.
4. Copy:

```text
tools/pal-save-import/cloud-sync.example.json
```

to:

```text
tools/pal-save-import/cloud-sync.json
```

5. Set:
   - `endpoint` to `https://YOUR-REBEL-DOMAIN/api/connectors/snapshot`
   - `serverId` to the server UUID from Rebel
   - `token` to the one-time connector token

`cloud-sync.json` is ignored by Git and must stay private.

## Runtime behaviour

Run Rebel normally:

```powershell
pnpm rebel
```

After every successful save refresh, the watcher:

1. copies the live save to the local working directory;
2. processes the copy;
3. generates the private application snapshot;
4. uploads only that processed snapshot when cloud sync is configured.

A cloud upload failure does not break local save processing. Rebel records the error and retries after the next save change.

## Vercel project settings

- Repository: `Naz94/rebel-palworld`
- Framework: Next.js
- Root directory: `apps/web`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
