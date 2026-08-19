import { NextResponse } from "next/server";

import {
  loadPalSnapshot,
} from "@/lib/palworld/load-pal-snapshot";

import {
  rankRealPals,
  type RealOwnedPal,
} from "@/lib/palworld/rank-pals";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WatcherFile = {
  status:
    | "starting"
    | "syncing"
    | "live"
    | "stopped"
    | "error";

  watcherPid: number | null;
  lastSyncAt: string | null;
  durationMs: number | null;
  palCount: number | null;
  saveSize: number | null;
  saveModifiedAt: string | null;
  signature: string | null;
  error: string | null;
  heartbeatAt: string | null;
  updatedAt: string | null;
};

// Everything below is derived purely from `entities` and is expensive
// to compute (rankRealPals scores every owned pal). It does NOT depend
// on the current time, so it's safe to cache and only recompute when
// the underlying snapshot has actually changed.
type DerivedFromEntities = {
  collection: {
    ownedPals: number;
    capturedHumans: number;
    unknownEntities: number;
    species: unknown;
    coreKeep: number;
    usefulBackup: number;
    borderlineCleanup: number;
    safeCleanup: number;
    unknown: number;
  };
  locations: {
    partyCount: number;
    partyCapacity: number;
    palboxCount: number;
    palboxCapacity: number;
    bases: Array<{
      baseIndex: number;
      count: number;
      capacity: number;
    }>;
  };
  party: Array<{
    id: string | null;
    entityType: string;
    species: string;
    nickname: string | null;
    level: number | null;
    gender: string | null;
    slot: number | null;
  }>;
};

// Module-level cache. Persists across requests within the same server
// process (fine for a single-user dev/self-hosted setup like this).
// Keyed on whatever uniquely identifies "the data hasn't changed":
// prefer the watcher's save signature, fall back to snapshot.syncedAt.
let derivedCache:
  | {
      key: string;
      value: DerivedFromEntities;
    }
  | null = null;

function computeDerivedFromEntities(
  entities: RealOwnedPal[],
): DerivedFromEntities {
  const rankings =
    rankRealPals(
      entities,
    );

  const party =
    entities
      .filter(
        (entry) =>
          entry.location.type ===
          "PARTY",
      )
      .sort(
        (a, b) =>
          (a.location.slotIndex ?? 999) -
          (b.location.slotIndex ?? 999),
      )
      .map(
        (entry) => ({
          id: entry.id,
          entityType:
            entry.entityType ??
            "PAL",
          species: entry.species,
          nickname: entry.nickname,
          level: entry.level,
          gender: entry.gender,
          slot:
            entry.location.displaySlot,
        }),
      );

  const palboxCount =
    entities.filter(
      (entry) =>
        entry.location.type ===
        "PALBOX",
    ).length;

  const discoveredBaseIndexes =
    [
      ...new Set(
        entities
          .filter(
            (entry) =>
              entry.location.type ===
                "BASE" &&
              typeof entry.location
                .baseIndex ===
                "number",
          )
          .map(
            (entry) =>
              entry.location
                .baseIndex as number,
          ),
      ),
    ].sort(
      (a, b) =>
        a - b,
    );

  const expectedBaseIndexes =
    [1, 2, 3, 4];

  const allBaseIndexes =
    [
      ...new Set([
        ...expectedBaseIndexes,
        ...discoveredBaseIndexes,
      ]),
    ].sort(
      (a, b) =>
        a - b,
    );

  const bases =
    allBaseIndexes.map(
      (baseIndex) => {
        const baseEntities =
          entities.filter(
            (entry) =>
              entry.location.type ===
                "BASE" &&
              entry.location.baseIndex ===
                baseIndex,
          );

        const detectedCapacity =
          baseEntities.find(
            (entry) =>
              typeof entry.location
                .capacity ===
                "number",
          )?.location.capacity;

        return {
          baseIndex,
          count:
            baseEntities.length,
          capacity:
            detectedCapacity ??
            26,
        };
      },
    );

  const unknownCount =
    entities.filter(
      (entry) =>
        entry.location.type ===
          "UNKNOWN" ||
        entry.location.type ===
          "OTHER",
    ).length;

  return {
    collection: {
      ownedPals:
        rankings.summary
          .totalPals,

      capturedHumans:
        rankings.summary
          .capturedHumans,

      unknownEntities:
        rankings.summary
          .unknownEntities,

      species:
        rankings.summary.species,

      coreKeep:
        rankings.coreKeep.length,

      usefulBackup:
        rankings.usefulBackup.length,

      borderlineCleanup:
        rankings.borderlineCleanup
          .length,

      safeCleanup:
        rankings.safeCleanup.length,

      unknown:
        unknownCount,
    },

    locations: {
      partyCount:
        party.length,
      partyCapacity:
        5,
      palboxCount,
      palboxCapacity:
        960,
      bases,
    },

    party,
  };
}

export async function GET() {
  try {
    const snapshot =
      await loadPalSnapshot<
        RealOwnedPal
      >();

    const entities =
      snapshot.entities;

    const watcher =
      snapshot.watcher as
        unknown as WatcherFile;

    const heartbeatAgeMs =
      watcher.heartbeatAt
        ? Date.now() -
          new Date(
            watcher.heartbeatAt,
          ).getTime()
        : Number.POSITIVE_INFINITY;

    // Your connector only uploads a full snapshot when Palworld's
    // save file actually changes (game autosave), not on a fixed
    // timer — autosaves are commonly 5-15 min apart. A 15-second
    // "alive" window meant this showed Offline almost all the time
    // even when the connector was working perfectly. 20 minutes
    // covers realistic autosave gaps while still catching a genuinely
    // dead connector.
    const watcherAlive =
      heartbeatAgeMs <
      20 * 60 * 1000;

    const effectiveStatus =
      watcherAlive
        ? watcher.status
        : "offline";

    // Cache key: prefer the save-file signature (changes only when the
    // actual save contents change), then syncedAt, then fall back to
    // entity count as a weak signal so we never crash on a missing key.
    const cacheKey =
      watcher.signature ??
      snapshot.syncedAt ??
      `count:${entities.length}`;

    let derived: DerivedFromEntities;

    if (
      derivedCache &&
      derivedCache.key === cacheKey
    ) {
      derived = derivedCache.value;
    } else {
      derived =
        computeDerivedFromEntities(
          entities,
        );

      derivedCache = {
        key: cacheKey,
        value: derived,
      };
    }

    return NextResponse.json(
      {
        generatedAt:
          new Date().toISOString(),

        snapshot: {
          source:
            snapshot.source,

          syncedAt:
            snapshot.syncedAt,
        },

        watcher: {
          ...watcher,
          status:
            effectiveStatus,
          watcherAlive,
          heartbeatAgeMs:
            Number.isFinite(
              heartbeatAgeMs,
            )
              ? heartbeatAgeMs
              : null,
        },

        collection:
          derived.collection,

        locations:
          derived.locations,

        party:
          derived.party,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}
