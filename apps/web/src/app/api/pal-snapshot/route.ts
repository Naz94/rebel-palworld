import fs from "node:fs";
import path from "node:path";

import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  expandStoredRankings,
  type CompactRankings,
} from "@/lib/palworld/rankings-compact";

import type {
  RealOwnedPal,
} from "@/lib/palworld/rank-pals";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

function readLocalJson(
  filePath: string,
): unknown {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8",
    ),
  ) as unknown;
}

function tryLocalSnapshot() {
  const webRoot =
    process.cwd();

  const projectRoot =
    path.resolve(
      webRoot,
      "..",
      "..",
    );

  const entitiesPath =
    path.join(
      webRoot,
      "src",
      "lib",
      "palworld",
      "owned-pals.generated.json",
    );

  if (
    !fs.existsSync(
      /*turbopackIgnore: true*/ entitiesPath,
    )
  ) {
    return null;
  }

  const watcherPath =
    path.join(
      projectRoot,
      "tools",
      "pal-save-import",
      "watcher-status.json",
    );

  const entities =
    readLocalJson(
      entitiesPath,
    );

  const watcher =
    fs.existsSync(
      /*turbopackIgnore: true*/ watcherPath,
    )
      ? readLocalJson(
          watcherPath,
        )
      : {};

  return {
    source:
      "local" as const,

    entities,

    watcher,

    // Local mode never gets a precomputed pass — there's no upload
    // step to compute it at. Caller falls back to client-side scoring.
    rankings:
      null,

    syncedAt:
      new Date()
        .toISOString(),

    server:
      null,
  };
}

export async function GET() {
  try {
    const hasSupabase =
      Boolean(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL,
      ) &&
      Boolean(
        process.env
          .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      );

    if (hasSupabase) {
      const supabase =
        await createClient();

      const {
        data: {
          user,
        },
      } =
        await supabase
          .auth
          .getUser();

      if (user) {
        const {
          data:
            snapshot,
          error,
        } =
          await supabase
            .from(
              "pal_snapshots",
            )
            .select(
              `
                entities,
                watcher,
                rankings,
                pal_count,
                world_id,
                save_modified_at,
                synced_at,
                servers!inner (
                  id,
                  name,
                  status,
                  last_seen_at
                )
              `,
            )
            .order(
              "synced_at",
              {
                ascending:
                  false,
              },
            )
            .limit(1)
            .maybeSingle();

        if (error) {
          console.error(
            "CLOUD SNAPSHOT READ ERROR:",
            error,
          );

          return NextResponse.json(
            {
              error:
                "Could not load cloud snapshot",
            },
            {
              status: 500,
            },
          );
        }

        if (snapshot) {
          return NextResponse.json(
            {
              source:
                "cloud",

              entities:
                snapshot.entities,

              watcher:
                snapshot.watcher,

              // Stored compactly (rankings-compact.ts) to avoid
              // shipping duplicate pal data across dozens of views.
              // Expand it back into the full shape here, server-side,
              // so pals/page.tsx needs no changes at all — it just
              // reads `rankings` exactly like before. Cheap: this is
              // reference lookups + object spreads, not rescoring.
              rankings:
                snapshot.rankings
                  ? expandStoredRankings(
                      snapshot.rankings as
                        CompactRankings,
                      snapshot.entities as
                        RealOwnedPal[],
                    )
                  : null,

              syncedAt:
                snapshot.synced_at,

              worldId:
                snapshot.world_id,

              saveModifiedAt:
                snapshot.save_modified_at,

              server:
                snapshot.servers,
            },
            {
              headers: {
                "Cache-Control":
                  "private, no-store",
              },
            },
          );
        }
      }
    }

    const local =
      tryLocalSnapshot();

    if (local) {
      return NextResponse.json(
        local,
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        error:
          hasSupabase
            ? "No synced Pal snapshot is available yet"
            : "No local Pal snapshot is available",
      },
      {
        status:
          hasSupabase
            ? 404
            : 503,
      },
    );
  } catch (error) {
    console.error(
      "PAL SNAPSHOT READ ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Could not load Pal data",
      },
      {
        status: 500,
      },
    );
  }
}
