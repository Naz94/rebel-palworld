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

    const entities =
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