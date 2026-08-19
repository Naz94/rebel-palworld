-- ============================================================
-- Precomputed Pal rankings
--
-- rankRealPals() is a fairly expensive scoring pass over a
-- player's whole Pal collection (combat/breeding/base-work
-- scoring, decision buckets, species grouping). It used to be
-- recomputed in every visitor's browser whenever their owned
-- Pal list changed. This column lets the connector's snapshot
-- upload compute it ONCE, server-side, and have every reader
-- (web, mobile, future clients) just read the result.
--
-- Nullable: older snapshots, or a snapshot where scoring
-- failed/was skipped, simply have no precomputed rankings and
-- callers should fall back to computing client-side.
-- ============================================================

alter table public.pal_snapshots
  add column rankings jsonb;

comment on column public.pal_snapshots.rankings is
  'Precomputed output of rankRealPals(entities), stored at snapshot-upload time. Null means "not computed yet / computation failed" and callers should fall back to computing it themselves.';
