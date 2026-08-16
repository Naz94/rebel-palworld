import fs from "node:fs";
import path from "node:path";

import {
  execFile,
} from "node:child_process";

import {
  promisify,
} from "node:util";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const execFileAsync =
  promisify(
    execFile,
  );

type DiscoveredWorld = {
  steamAccountId: string;
  accountLooksValid: boolean;

  worldId: string;
  worldIdLooksValid: boolean;

  worldPath: string;
  levelSavPath: string;

  levelSavSize: number;

  lastModifiedAt: string;
  lastModifiedMs: number;

  hasLevelMeta: boolean;
  hasLocalData: boolean;
  hasWorldOption: boolean;
  hasPlayersFolder: boolean;
};

type DiscoveryResult = {
  saveRoot: string | null;

  worlds:
    DiscoveredWorld[];
};

type SelectedWorldConfig = {
  steamAccountId: string;
  worldId: string;
  worldPath: string;
  levelSavPath: string;
  selectedAt: string;
};

type SelectWorldRequest = {
  steamAccountId?: unknown;
  worldId?: unknown;
};

function getProjectPaths() {
  const webRoot =
    process.cwd();

  const projectRoot =
    path.resolve(
      webRoot,
      "..",
      "..",
    );

  const toolsRoot =
    path.join(
      projectRoot,
      "tools",
      "pal-save-import",
    );

  return {
    webRoot,
    projectRoot,
    toolsRoot,

    discoveryScript:
      path.join(
        toolsRoot,
        "discover-worlds.mjs",
      ),

    selectedWorldPath:
      path.join(
        toolsRoot,
        "selected-world.json",
      ),
  };
}

function readSelectedWorld(
  selectedWorldPath: string,
): SelectedWorldConfig | null {
  try {
    if (
      !fs.existsSync(
        selectedWorldPath,
      )
    ) {
      return null;
    }

    return JSON.parse(
      fs.readFileSync(
        selectedWorldPath,
        "utf8",
      ),
    ) as SelectedWorldConfig;
  } catch {
    return null;
  }
}

async function discoverWorlds(): Promise<DiscoveryResult> {
  const {
    projectRoot,
    discoveryScript,
  } =
    getProjectPaths();

  if (
    !fs.existsSync(
      /* turbopackIgnore: true */
      discoveryScript,
    )
  ) {
    throw new Error(
      `World discovery script not found: ${discoveryScript}`,
    );
  }

  const {
    stdout,
  } =
    await execFileAsync(
      process.execPath,
      [
        discoveryScript,
        "--json",
      ],
      {
        cwd:
          projectRoot,

        windowsHide:
          true,

        maxBuffer:
          1024 *
          1024 *
          10,
      },
    );

  return JSON.parse(
    stdout,
  ) as DiscoveryResult;
}

function writeSelectedWorld(
  selectedWorldPath: string,
  world: DiscoveredWorld,
) {
  const payload: SelectedWorldConfig = {
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

  const temporaryPath =
    `${selectedWorldPath}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(
      payload,
      null,
      2,
    ),
    "utf8",
  );

  fs.renameSync(
    temporaryPath,
    selectedWorldPath,
  );

  return payload;
}

function buildWorldResponse(
  discovery: DiscoveryResult,
  selected:
    SelectedWorldConfig | null,
) {
  const worlds =
    discovery.worlds.map(
      (world) => ({
        ...world,

        selected:
          selected?.steamAccountId ===
            world.steamAccountId &&
          selected?.worldId ===
            world.worldId,
      }),
    );

  return {
    detected:
      worlds.length > 0,

    saveRoot:
      discovery.saveRoot,

    worldCount:
      worlds.length,

    selectedWorldId:
      selected?.worldId ??
      null,

    selectedSteamAccountId:
      selected?.steamAccountId ??
      null,

    worlds,

    generatedAt:
      new Date()
        .toISOString(),
  };
}

export async function GET() {
  try {
    const {
      selectedWorldPath,
    } =
      getProjectPaths();

    const discovery =
      await discoverWorlds();

    const selected =
      readSelectedWorld(
        selectedWorldPath,
      );

    return NextResponse.json(
      buildWorldResponse(
        discovery,
        selected,
      ),
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
        detected:
          false,

        saveRoot:
          null,

        worldCount:
          0,

        selectedWorldId:
          null,

        selectedSteamAccountId:
          null,

        worlds:
          [],

        error:
          error instanceof Error
            ? error.message
            : String(error),

        generatedAt:
          new Date()
            .toISOString(),
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as SelectWorldRequest;

    const steamAccountId =
      typeof body.steamAccountId ===
      "string"
        ? body.steamAccountId
        : null;

    const worldId =
      typeof body.worldId ===
      "string"
        ? body.worldId
        : null;

    if (
      !steamAccountId ||
      !worldId
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "steamAccountId and worldId are required.",
        },
        {
          status:
            400,
        },
      );
    }

    const discovery =
      await discoverWorlds();

    const requestedWorld =
      discovery.worlds.find(
        (world) =>
          world.steamAccountId ===
            steamAccountId &&
          world.worldId ===
            worldId,
      );

    if (!requestedWorld) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "The requested Palworld world was not found on this computer.",
        },
        {
          status:
            404,
        },
      );
    }

    const levelStats =
      fs.statSync(
        requestedWorld.levelSavPath,
      );

    if (
      !levelStats.isFile()
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "The selected world does not contain a valid Level.sav.",
        },
        {
          status:
            400,
        },
      );
    }

    const {
      selectedWorldPath,
    } =
      getProjectPaths();

    const selected =
      writeSelectedWorld(
        selectedWorldPath,
        requestedWorld,
      );

    return NextResponse.json(
      {
        ok:
          true,

        selected,

        message:
          "Palworld world selected successfully.",
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status:
          500,
      },
    );
  }
}