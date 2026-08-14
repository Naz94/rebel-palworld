import fs from "node:fs";
import path from "node:path";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type SelectedWorld = {
  steamAccountId: string;
  worldId: string;
  worldPath: string;
  levelSavPath: string;
  selectedAt: string;
};

type BaseNames = Record<
  string,
  string
>;

type WorldPreference = {
  baseNames: BaseNames;
  updatedAt: string;
};

type PreferencesFile = {
  worlds: Record<
    string,
    WorldPreference
  >;
};

type UpdateRequest = {
  baseNames?: unknown;
};

function getPaths() {
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
    selectedWorldPath:
      path.join(
        toolsRoot,
        "selected-world.json",
      ),

    preferencesPath:
      path.join(
        toolsRoot,
        "world-preferences.json",
      ),
  };
}

function readJson<T>(
  filePath: string,
): T | null {
  try {
    if (
      !fs.existsSync(
        filePath,
      )
    ) {
      return null;
    }

    return JSON.parse(
      fs.readFileSync(
        filePath,
        "utf8",
      ),
    ) as T;
  } catch {
    return null;
  }
}

function readSelectedWorld() {
  const {
    selectedWorldPath,
  } =
    getPaths();

  return readJson<SelectedWorld>(
    selectedWorldPath,
  );
}

function readPreferences(): PreferencesFile {
  const {
    preferencesPath,
  } =
    getPaths();

  return (
    readJson<PreferencesFile>(
      preferencesPath,
    ) ?? {
      worlds: {},
    }
  );
}

function writePreferences(
  preferences: PreferencesFile,
) {
  const {
    preferencesPath,
  } =
    getPaths();

  const temporaryPath =
    `${preferencesPath}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(
      preferences,
      null,
      2,
    ),
    "utf8",
  );

  fs.renameSync(
    temporaryPath,
    preferencesPath,
  );
}

function defaultBaseNames(): BaseNames {
  return {
    "1":
      "Base 1",

    "2":
      "Base 2",

    "3":
      "Base 3",
  };
}

function sanitizeBaseNames(
  value: unknown,
): BaseNames | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return null;
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  const result:
    BaseNames = {};

  for (
    const baseIndex
    of [
      "1",
      "2",
      "3",
    ]
  ) {
    const candidate =
      source[
        baseIndex
      ];

    if (
      typeof candidate !==
      "string"
    ) {
      continue;
    }

    const cleaned =
      candidate
        .trim()
        .slice(
          0,
          40,
        );

    if (
      cleaned.length > 0
    ) {
      result[
        baseIndex
      ] =
        cleaned;
    }
  }

  return result;
}

export async function GET() {
  try {
    const selectedWorld =
      readSelectedWorld();

    if (!selectedWorld) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "No Palworld world is currently selected.",
        },
        {
          status:
            404,
        },
      );
    }

    const preferences =
      readPreferences();

    const worldPreferences =
      preferences.worlds[
        selectedWorld.worldId
      ];

    return NextResponse.json(
      {
        ok:
          true,

        worldId:
          selectedWorld.worldId,

        steamAccountId:
          selectedWorld.steamAccountId,

        baseNames: {
          ...defaultBaseNames(),

          ...worldPreferences
            ?.baseNames,
        },

        updatedAt:
          worldPreferences
            ?.updatedAt ??
          null,
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
        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),
      },
      {
        status:
          500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  try {
    const selectedWorld =
      readSelectedWorld();

    if (!selectedWorld) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "No Palworld world is currently selected.",
        },
        {
          status:
            404,
        },
      );
    }

    const body =
      (await request.json()) as UpdateRequest;

    const incomingNames =
      sanitizeBaseNames(
        body.baseNames,
      );

    if (!incomingNames) {
      return NextResponse.json(
        {
          ok:
            false,

          error:
            "baseNames must be a valid object.",
        },
        {
          status:
            400,
        },
      );
    }

    const preferences =
      readPreferences();

    const previous =
      preferences.worlds[
        selectedWorld.worldId
      ];

    const updatedNames = {
      ...defaultBaseNames(),

      ...previous
        ?.baseNames,

      ...incomingNames,
    };

    const updatedAt =
      new Date()
        .toISOString();

    preferences.worlds[
      selectedWorld.worldId
    ] = {
      baseNames:
        updatedNames,

      updatedAt,
    };

    writePreferences(
      preferences,
    );

    return NextResponse.json(
      {
        ok:
          true,

        worldId:
          selectedWorld.worldId,

        baseNames:
          updatedNames,

        updatedAt,
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
            : String(
                error,
              ),
      },
      {
        status:
          500,
      },
    );
  }
}