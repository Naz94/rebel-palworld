import fs from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

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

function readJson<T>(
  filePath: string,
): T {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8",
    ),
  ) as T;
}

export async function GET() {
  try {
    const webRoot =
      process.cwd();

    const projectRoot =
      path.resolve(
        webRoot,
        "..",
        "..",
      );

    const palsPath =
      path.join(
        webRoot,
        "src",
        "lib",
        "palworld",
        "owned-pals.generated.json",
      );

    const watcherPath =
      path.join(
        projectRoot,
        "tools",
        "pal-save-import",
        "watcher-status.json",
      );

    const pals =
      readJson<RealOwnedPal[]>(
        palsPath,
      );

    const watcher =
      readJson<WatcherFile>(
        watcherPath,
      );

    const heartbeatAgeMs =
      watcher.heartbeatAt
        ? Date.now() -
          new Date(
            watcher.heartbeatAt,
          ).getTime()
        : Number.POSITIVE_INFINITY;

    const watcherAlive =
      heartbeatAgeMs < 15000;

    const effectiveStatus =
      watcherAlive
        ? watcher.status
        : "offline";

    const rankings =
      rankRealPals(
        pals,
      );

    // ============================================================
    // PARTY
    // ============================================================

    const party =
      pals
        .filter(
          (pal) =>
            pal.location.type ===
            "PARTY",
        )
        .sort(
          (a, b) =>
            (a.location.slotIndex ?? 999) -
            (b.location.slotIndex ?? 999),
        )
        .map(
          (pal) => ({
            id:
              pal.id,

            species:
              pal.species,

            nickname:
              pal.nickname,

            level:
              pal.level,

            gender:
              pal.gender,

            slot:
              pal.location.displaySlot,
          }),
        );

    // ============================================================
    // PALBOX
    // ============================================================

    const palboxCount =
      pals.filter(
        (pal) =>
          pal.location.type ===
          "PALBOX",
      ).length;

    // ============================================================
    // BASE DISCOVERY
    //
    // Do NOT hardcode [1, 2, 3].
    //
    // Any BASE index discovered in the generated
    // Pal data becomes part of world-state automatically.
    // ============================================================

    const discoveredBaseIndexes =
      [
        ...new Set(
          pals
            .filter(
              (pal) =>
                pal.location.type ===
                  "BASE" &&
                typeof pal.location
                  .baseIndex ===
                  "number",
            )
            .map(
              (pal) =>
                pal.location
                  .baseIndex as number,
            ),
        ),
      ].sort(
        (a, b) =>
          a - b,
      );

    /*
     * Important:
     *
     * An empty base has no assigned Pals, so it may not
     * appear in the Pal-derived set.
     *
     * Your current save pipeline has detected four bases.
     * Ensure Bases 1–4 remain visible even when empty.
     *
     * If additional bases appear later, their discovered
     * indices are included automatically.
     */
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
          const basePals =
            pals.filter(
              (pal) =>
                pal.location.type ===
                  "BASE" &&
                pal.location.baseIndex ===
                  baseIndex,
            );

          const detectedCapacity =
            basePals.find(
              (pal) =>
                typeof pal.location
                  .capacity ===
                  "number",
            )?.location.capacity;

          return {
            baseIndex,

            count:
              basePals.length,

            capacity:
              detectedCapacity ??
              26,
          };
        },
      );

    // ============================================================
    // UNKNOWN / OTHER
    // ============================================================

    const unknownCount =
      pals.filter(
        (pal) =>
          pal.location.type ===
            "UNKNOWN" ||
          pal.location.type ===
            "OTHER",
      ).length;

    // ============================================================
    // RESPONSE
    // ============================================================

    return NextResponse.json(
      {
        generatedAt:
          new Date().toISOString(),

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

        collection: {
          ownedPals:
            pals.length,

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