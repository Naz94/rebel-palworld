import fs from "node:fs";
import path from "node:path";

import {
  createClient,
} from "@/lib/supabase/server";

export type LoadedPalSnapshot<T> = {
  source:
    | "cloud"
    | "local";

  entities:
    T[];

  watcher:
    Record<
      string,
      unknown
    >;

  syncedAt:
    string |
    null;
};

function readJson(
  filePath: string,
): unknown {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8",
    ),
  ) as unknown;
}

export async function loadPalSnapshot<
  T,
>(): Promise<
  LoadedPalSnapshot<T>
> {
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
            "entities, watcher, synced_at",
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
        throw new Error(
          `Could not load cloud Pal snapshot: ${error.message}`,
        );
      }

      if (
        snapshot &&
        Array.isArray(
          snapshot.entities,
        )
      ) {
        return {
          source:
            "cloud",

          entities:
            snapshot.entities as T[],

          watcher:
            snapshot.watcher &&
            typeof snapshot.watcher ===
              "object" &&
            !Array.isArray(
              snapshot.watcher,
            )
              ? snapshot.watcher as Record<string, unknown>
              : {},

          syncedAt:
            snapshot.synced_at ??
            null,
        };
      }
    }
  }

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
    throw new Error(
      "No Pal snapshot is available. Sign in to Rebel Cloud or run the local save watcher.",
    );
  }

  const entities =
    readJson(
      entitiesPath,
    );

  if (
    !Array.isArray(
      entities,
    )
  ) {
    throw new Error(
      "Local Pal snapshot is invalid",
    );
  }

  const watcherPath =
    path.join(
      projectRoot,
      "tools",
      "pal-save-import",
      "watcher-status.json",
    );

  const watcher =
    fs.existsSync(
      /*turbopackIgnore: true*/ watcherPath,
    )
      ? readJson(
          watcherPath,
        )
      : {};

  return {
    source:
      "local",

    entities:
      entities as T[],

    watcher:
      watcher &&
      typeof watcher ===
        "object" &&
      !Array.isArray(
        watcher,
      )
        ? watcher as Record<string, unknown>
        : {},

    syncedAt:
      null,
  };
}
