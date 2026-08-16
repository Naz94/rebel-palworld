import fs from "node:fs";
import path from "node:path";
import {
  fileURLToPath,
} from "node:url";

const __filename =
  fileURLToPath(
    import.meta.url,
  );

const __dirname =
  path.dirname(
    __filename,
  );

const projectRoot =
  path.resolve(
    __dirname,
    "..",
    "..",
  );

const configPath =
  path.join(
    __dirname,
    "cloud-sync.json",
  );

const entitiesPath =
  path.join(
    projectRoot,
    "apps",
    "web",
    "src",
    "lib",
    "palworld",
    "owned-pals.generated.json",
  );

const watcherPath =
  path.join(
    __dirname,
    "watcher-status.json",
  );

function readJson(
  filePath,
) {
  return JSON.parse(
    fs.readFileSync(
      filePath,
      "utf8",
    ),
  );
}

function validateConfig(
  config,
) {
  const endpoint =
    typeof config?.endpoint ===
      "string"
      ? config.endpoint.trim()
      : "";

  const serverId =
    typeof config?.serverId ===
      "string"
      ? config.serverId.trim()
      : "";

  const token =
    typeof config?.token ===
      "string"
      ? config.token.trim()
      : "";

  if (
    !endpoint.startsWith(
      "https://",
    ) ||
    !serverId ||
    !token
  ) {
    throw new Error(
      "cloud-sync.json is incomplete",
    );
  }

  return {
    endpoint,
    serverId,
    token,
  };
}

if (
  !fs.existsSync(
    configPath,
  )
) {
  console.log(
    "Cloud sync is not configured; local snapshot remains available.",
  );

  process.exit(0);
}

const config =
  validateConfig(
    readJson(
      configPath,
    ),
  );

const entities =
  readJson(
    entitiesPath,
  );

const watcher =
  fs.existsSync(
    watcherPath,
  )
    ? readJson(
        watcherPath,
      )
    : {};

if (
  !Array.isArray(
    entities,
  )
) {
  throw new Error(
    "Generated Pal data is not an array",
  );
}

const response =
  await fetch(
    config.endpoint,
    {
      method:
        "POST",

      headers: {
        Authorization:
          `Bearer ${config.token}`,

        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify({
          serverId:
            config.serverId,

          schemaVersion:
            1,

          entities,

          watcher,

          worldId:
            watcher.world
              ?.worldId ??
            null,

          saveSignature:
            watcher.signature ??
            null,

          saveModifiedAt:
            watcher.saveModifiedAt ??
            null,
        }),
    },
  );

const responseBody =
  await response
    .json()
    .catch(
      () => ({}),
    );

if (
  !response.ok
) {
  throw new Error(
    responseBody.error ??
    `Cloud sync failed with HTTP ${response.status}`,
  );
}

console.log(
  `Cloud snapshot uploaded: ${responseBody.palCount ?? entities.length} entities at ${responseBody.syncedAt ?? "unknown time"}.`,
);
