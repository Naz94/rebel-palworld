import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

// ------------------------------------------------------------
// PALWORLD WORLD DISCOVERY
// ------------------------------------------------------------
//
// READ ONLY.
//
// This module never modifies Palworld save data.
//
// It can be used:
//
// 1. From another Node module:
//
//    import {
//      discoverPalworldWorlds,
//    } from "./discover-worlds.mjs";
//
// 2. From PowerShell:
//
//    node discover-worlds.mjs
//
// 3. As machine-readable JSON:
//
//    node discover-worlds.mjs --json
//
// ------------------------------------------------------------

export function getPalworldSaveRoot() {
  const localAppData =
    process.env.LOCALAPPDATA;

  if (!localAppData) {
    return null;
  }

  return path.join(
    localAppData,
    "Pal",
    "Saved",
    "SaveGames",
  );
}

function safeStat(
  filePath,
) {
  try {
    return fs.statSync(
      filePath,
    );
  } catch {
    return null;
  }
}

function safeReadDirectory(
  directory,
) {
  try {
    return fs.readdirSync(
      directory,
      {
        withFileTypes: true,
      },
    );
  } catch {
    return [];
  }
}

function isBackupDirectory(
  name,
) {
  return (
    name.toLowerCase() ===
    "backup"
  );
}

function looksLikeSteamAccountId(
  name,
) {
  return /^\d+$/.test(
    name,
  );
}

function looksLikeWorldId(
  name,
) {
  return /^[A-Fa-f0-9]{16,64}$/.test(
    name,
  );
}

// ------------------------------------------------------------
// DISCOVERY
// ------------------------------------------------------------

export function discoverPalworldWorlds() {
  const palworldSaveRoot =
    getPalworldSaveRoot();

  if (!palworldSaveRoot) {
    return [];
  }

  const rootStats =
    safeStat(
      palworldSaveRoot,
    );

  if (
    !rootStats ||
    !rootStats.isDirectory()
  ) {
    return [];
  }

  const discovered =
    [];

  const accountFolders =
    safeReadDirectory(
      palworldSaveRoot,
    );

  for (
    const accountEntry
    of accountFolders
  ) {
    if (
      !accountEntry.isDirectory()
    ) {
      continue;
    }

    if (
      isBackupDirectory(
        accountEntry.name,
      )
    ) {
      continue;
    }

    const accountPath =
      path.join(
        palworldSaveRoot,
        accountEntry.name,
      );

    const worldFolders =
      safeReadDirectory(
        accountPath,
      );

    for (
      const worldEntry
      of worldFolders
    ) {
      if (
        !worldEntry.isDirectory()
      ) {
        continue;
      }

      if (
        isBackupDirectory(
          worldEntry.name,
        )
      ) {
        continue;
      }

      const worldPath =
        path.join(
          accountPath,
          worldEntry.name,
        );

      const levelSavPath =
        path.join(
          worldPath,
          "Level.sav",
        );

      const levelStats =
        safeStat(
          levelSavPath,
        );

      if (
        !levelStats ||
        !levelStats.isFile()
      ) {
        continue;
      }

      const levelMetaPath =
        path.join(
          worldPath,
          "LevelMeta.sav",
        );

      const localDataPath =
        path.join(
          worldPath,
          "LocalData.sav",
        );

      const worldOptionPath =
        path.join(
          worldPath,
          "WorldOption.sav",
        );

      const playersPath =
        path.join(
          worldPath,
          "Players",
        );

      discovered.push({
        steamAccountId:
          accountEntry.name,

        accountLooksValid:
          looksLikeSteamAccountId(
            accountEntry.name,
          ),

        worldId:
          worldEntry.name,

        worldIdLooksValid:
          looksLikeWorldId(
            worldEntry.name,
          ),

        worldPath,

        levelSavPath,

        levelSavSize:
          levelStats.size,

        lastModifiedAt:
          levelStats.mtime
            .toISOString(),

        lastModifiedMs:
          levelStats.mtimeMs,

        hasLevelMeta:
          Boolean(
            safeStat(
              levelMetaPath,
            ),
          ),

        hasLocalData:
          Boolean(
            safeStat(
              localDataPath,
            ),
          ),

        hasWorldOption:
          Boolean(
            safeStat(
              worldOptionPath,
            ),
          ),

        hasPlayersFolder:
          Boolean(
            safeStat(
              playersPath,
            )?.isDirectory(),
          ),
      });
    }
  }

  discovered.sort(
    (a, b) =>
      b.lastModifiedMs -
      a.lastModifiedMs,
  );

  return discovered;
}

// ------------------------------------------------------------
// HUMAN OUTPUT
// ------------------------------------------------------------

function printWorlds(
  worlds,
) {
  const root =
    getPalworldSaveRoot();

  console.log("");
  console.log(
    "============================================================",
  );
  console.log(
    " REBEL PALWORLD WORLD DISCOVERY",
  );
  console.log(
    "============================================================",
  );
  console.log("");

  console.log(
    `Scanning: ${root ?? "Unknown"}`,
  );

  console.log("");

  if (
    worlds.length === 0
  ) {
    console.log(
      "No Palworld worlds containing Level.sav were found.",
    );

    return;
  }

  console.log(
    `Found ${worlds.length} Palworld world${
      worlds.length === 1
        ? ""
        : "s"
    }.`,
  );

  console.log("");

  worlds.forEach(
    (
      world,
      index,
    ) => {
      console.log(
        `WORLD ${index + 1}`,
      );

      console.log(
        `Steam Account: ${world.steamAccountId}`,
      );

      console.log(
        `World ID:      ${world.worldId}`,
      );

      console.log(
        `Level.sav:     ${world.levelSavPath}`,
      );

      console.log(
        `Size:          ${world.levelSavSize.toLocaleString()} bytes`,
      );

      console.log(
        `Last Modified: ${new Date(
          world.lastModifiedAt,
        ).toLocaleString()}`,
      );

      console.log(
        `Players:       ${
          world.hasPlayersFolder
            ? "yes"
            : "no"
        }`,
      );

      console.log(
        `LevelMeta:     ${
          world.hasLevelMeta
            ? "yes"
            : "no"
        }`,
      );

      console.log(
        `LocalData:     ${
          world.hasLocalData
            ? "yes"
            : "no"
        }`,
      );

      console.log(
        `WorldOption:   ${
          world.hasWorldOption
            ? "yes"
            : "no"
        }`,
      );

      console.log("");
    },
  );
}

// ------------------------------------------------------------
// DIRECT RUN
// ------------------------------------------------------------

const isDirectRun =
  process.argv[1] &&
  path.resolve(
    process.argv[1],
  ) ===
    path.resolve(
      __filename,
    );

if (isDirectRun) {
  const worlds =
    discoverPalworldWorlds();

  if (
    process.argv.includes(
      "--json",
    )
  ) {
    process.stdout.write(
      JSON.stringify(
        {
          saveRoot:
            getPalworldSaveRoot(),

          worlds,
        },
      ),
    );
  } else {
    printWorlds(
      worlds,
    );
  }
}