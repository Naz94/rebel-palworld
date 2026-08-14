import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  discoverPalworldWorlds,
} from "./discover-worlds.mjs";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const configPath =
  path.join(
    __dirname,
    "selected-world.json",
  );

export function readSelectedWorldConfig() {
  try {
    if (
      !fs.existsSync(
        configPath,
      )
    ) {
      return null;
    }

    return JSON.parse(
      fs.readFileSync(
        configPath,
        "utf8",
      ),
    );
  } catch {
    return null;
  }
}

export function writeSelectedWorldConfig(
  world,
) {
  const payload = {
    steamAccountId:
      world.steamAccountId,

    worldId:
      world.worldId,

    worldPath:
      world.worldPath,

    levelSavPath:
      world.levelSavPath,

    selectedAt:
      new Date()
        .toISOString(),
  };

  fs.writeFileSync(
    configPath,
    JSON.stringify(
      payload,
      null,
      2,
    ),
    "utf8",
  );

  return payload;
}

export function resolveSelectedWorld() {
  const worlds =
    discoverPalworldWorlds();

  if (
    worlds.length === 0
  ) {
    return {
      status:
        "none-found",

      selectedWorld:
        null,

      worlds,
    };
  }

  const saved =
    readSelectedWorldConfig();

  if (saved) {
    const matching =
      worlds.find(
        (world) =>
          world.worldId ===
            saved.worldId &&
          world.steamAccountId ===
            saved.steamAccountId,
      );

    if (matching) {
      return {
        status:
          "selected",

        selectedWorld:
          matching,

        worlds,
      };
    }
  }

  if (
    worlds.length === 1
  ) {
    const selected =
      worlds[0];

    writeSelectedWorldConfig(
      selected,
    );

    return {
      status:
        "auto-selected",

      selectedWorld:
        selected,

      worlds,
    };
  }

  return {
    status:
      "selection-required",

    selectedWorld:
      null,

    worlds,
  };
}

function printResolution() {
  const result =
    resolveSelectedWorld();

  console.log("");
  console.log(
    "============================================================",
  );
  console.log(
    " REBEL PALWORLD WORLD CONFIG",
  );
  console.log(
    "============================================================",
  );
  console.log("");

  console.log(
    `Status: ${result.status}`,
  );

  console.log(
    `Worlds found: ${result.worlds.length}`,
  );

  console.log("");

  if (
    result.selectedWorld
  ) {
    console.log(
      "Selected world:",
    );

    console.log(
      `Steam Account: ${result.selectedWorld.steamAccountId}`,
    );

    console.log(
      `World ID:      ${result.selectedWorld.worldId}`,
    );

    console.log(
      `Level.sav:     ${result.selectedWorld.levelSavPath}`,
    );
  } else {
    console.log(
      "No world selected.",
    );
  }

  console.log("");
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(
    process.argv[1],
  ) ===
    path.resolve(
      __filename,
    );

if (isDirectRun) {
  printResolution();
}