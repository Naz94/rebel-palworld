import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  resolveSelectedWorld,
} from "./world-config.mjs";

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const projectRoot =
  path.resolve(
    __dirname,
    "..",
    "..",
  );

// ------------------------------------------------------------
// PATHS
// ------------------------------------------------------------

const selectedWorldConfigPath =
  path.join(
    __dirname,
    "selected-world.json",
  );

const workingDirectory =
  path.join(
    __dirname,
    "working",
  );

const workingSavePath =
  path.join(
    workingDirectory,
    "Level.sav",
  );

const levelJsonPath =
  path.join(
    __dirname,
    "level.json",
  );

const pstDirectory =
  path.join(
    __dirname,
    "pst-modern",
  );

const pythonPath =
  path.join(
    pstDirectory,
    ".venv",
    "Scripts",
    "python.exe",
  );

const palsavSourcePath =
  path.join(
    pstDirectory,
    "src",
    "palsav",
  );

const extractScript =
  path.join(
    __dirname,
    "extract-pals.mjs",
  );

const normalizeScript =
  path.join(
    __dirname,
    "normalize-pals.mjs",
  );

const buildScript =
  path.join(
    __dirname,
    "build-app-data.mjs",
  );

const cloudSyncScript =
  path.join(
    __dirname,
    "sync-cloud-snapshot.mjs",
  );

const cloudSyncConfigPath =
  path.join(
    __dirname,
    "cloud-sync.json",
  );

const generatedPalsPath =
  path.join(
    projectRoot,
    "apps",
    "web",
    "src",
    "lib",
    "palworld",
    "owned-pals.generated.json",
  );

const watcherStatusPath =
  path.join(
    __dirname,
    "watcher-status.json",
  );

// ------------------------------------------------------------
// SETTINGS
// ------------------------------------------------------------

const SAVE_SETTLE_TIME_MS =
  2000;

const POLL_INTERVAL_MS =
  1000;

const HEARTBEAT_INTERVAL_MS =
  5000;

const WORLD_CONFIG_POLL_INTERVAL_MS =
  1000;

// ------------------------------------------------------------
// WORLD STATE
// ------------------------------------------------------------

let worldResolution =
  null;

let selectedWorld =
  null;

let liveSavePath =
  null;

let selectedWorldConfigSignature =
  null;

// ------------------------------------------------------------
// SYNC STATE
// ------------------------------------------------------------

let lastImportedSignature =
  null;

let candidateSignature =
  null;

let candidateSince =
  null;

let syncing =
  false;

let syncRequestedWhileBusy =
  false;

let currentStatus =
  "starting";

let lastSuccessfulSyncAt =
  null;

let lastDurationMs =
  null;

let lastPalCount =
  null;

let lastError =
  null;

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function timestamp() {
  return new Date()
    .toLocaleTimeString();
}

function log(message) {
  console.log(
    `[${timestamp()}] ${message}`,
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

function getConfigSignature() {
  const stats =
    safeStat(
      selectedWorldConfigPath,
    );

  if (!stats) {
    return null;
  }

  return `${stats.size}:${stats.mtimeMs}`;
}

function getSaveInfo() {
  if (!liveSavePath) {
    return null;
  }

  try {
    const stats =
      fs.statSync(
        liveSavePath,
      );

    return {
      size:
        stats.size,

      modifiedMs:
        stats.mtimeMs,

      modifiedAt:
        stats.mtime
          .toISOString(),

      signature:
        `${stats.size}:${stats.mtimeMs}`,
    };
  } catch {
    return null;
  }
}

function getGeneratedPalCount() {
  try {
    if (
      !fs.existsSync(
        generatedPalsPath,
      )
    ) {
      return null;
    }

    const parsed =
      JSON.parse(
        fs.readFileSync(
          generatedPalsPath,
          "utf8",
        ),
      );

    return Array.isArray(parsed)
      ? parsed.length
      : null;
  } catch {
    return null;
  }
}

function readPreviousStatus() {
  try {
    if (
      !fs.existsSync(
        watcherStatusPath,
      )
    ) {
      return null;
    }

    return JSON.parse(
      fs.readFileSync(
        watcherStatusPath,
        "utf8",
      ),
    );
  } catch {
    return null;
  }
}

function writeWatcherStatus({
  status = currentStatus,
  error = lastError,
  signature = null,
} = {}) {
  currentStatus =
    status;

  lastError =
    error;

  const save =
    getSaveInfo();

  const now =
    new Date()
      .toISOString();

  const payload = {
    status:
      currentStatus,

    watcherPid:
      process.pid,

    world:
      selectedWorld
        ? {
            steamAccountId:
              selectedWorld.steamAccountId,

            worldId:
              selectedWorld.worldId,

            worldPath:
              selectedWorld.worldPath,

            levelSavPath:
              selectedWorld.levelSavPath,

            selectionStatus:
              worldResolution?.status ??
              null,
          }
        : null,

    lastSyncAt:
      lastSuccessfulSyncAt,

    durationMs:
      lastDurationMs,

    palCount:
      lastPalCount,

    saveSize:
      save?.size ??
      null,

    saveModifiedAt:
      save?.modifiedAt ??
      null,

    signature:
      signature ??
      save?.signature ??
      null,

    error:
      lastError,

    heartbeatAt:
      now,

    updatedAt:
      now,
  };

  fs.writeFileSync(
    watcherStatusPath,
    JSON.stringify(
      payload,
      null,
      2,
    ),
    "utf8",
  );
}

function runCommand(
  command,
  args,
  options = {},
) {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const child =
        spawn(
          command,
          args,
          {
            cwd:
              options.cwd ??
              projectRoot,

            env:
              options.env ??
              process.env,

            stdio:
              "inherit",

            shell:
              false,
          },
        );

      child.on(
        "error",
        reject,
      );

      child.on(
        "exit",
        (
          code,
          signal,
        ) => {
          if (
            code === 0
          ) {
            resolve();
            return;
          }

          reject(
            new Error(
              signal
                ? `${command} stopped with signal ${signal}`
                : `${command} exited with code ${code}`,
            ),
          );
        },
      );
    },
  );
}

// ------------------------------------------------------------
// WORLD SELECTION
// ------------------------------------------------------------

function resolveWorldNow() {
  const resolution =
    resolveSelectedWorld();

  if (
    !resolution.selectedWorld
  ) {
    return {
      ok:
        false,

      resolution,

      error:
        resolution.status ===
        "selection-required"
          ? "Multiple Palworld worlds were found and none is selected."
          : "No Palworld world could be resolved.",
    };
  }

  const saveStats =
    safeStat(
      resolution.selectedWorld
        .levelSavPath,
    );

  if (
    !saveStats ||
    !saveStats.isFile()
  ) {
    return {
      ok:
        false,

      resolution,

      error:
        "The selected Palworld Level.sav could not be found.",
    };
  }

  return {
    ok:
      true,

    resolution,

    error:
      null,
  };
}

function applyWorldSelection(
  resolution,
  {
    forceInitialSync = true,
  } = {},
) {
  const previousWorldId =
    selectedWorld?.worldId ??
    null;

  const previousSteamAccountId =
    selectedWorld?.steamAccountId ??
    null;

  worldResolution =
    resolution;

  selectedWorld =
    resolution.selectedWorld;

  liveSavePath =
    selectedWorld.levelSavPath;

  const changed =
    previousWorldId !==
      selectedWorld.worldId ||
    previousSteamAccountId !==
      selectedWorld.steamAccountId;

  if (
    changed
  ) {
    console.log("");

    console.log(
      "============================================================",
    );

    log(
      "PALWORLD WORLD SELECTION CHANGED",
    );

    console.log(
      "============================================================",
    );

    console.log("");

    console.log(
      `Steam account: ${selectedWorld.steamAccountId}`,
    );

    console.log(
      `World ID:      ${selectedWorld.worldId}`,
    );

    console.log("");

    console.log(
      "Watching:",
    );

    console.log(
      liveSavePath,
    );

    console.log("");
  }

  if (
    forceInitialSync
  ) {
    lastImportedSignature =
      null;

    candidateSignature =
      null;

    candidateSince =
      null;

    syncRequestedWhileBusy =
      false;

    const save =
      getSaveInfo();

    if (save) {
      candidateSignature =
        save.signature;

      candidateSince =
        Date.now() -
        SAVE_SETTLE_TIME_MS;
    }
  }

  writeWatcherStatus({
    status:
      syncing
        ? "syncing"
        : "starting",

    error:
      null,
  });

  return changed;
}

function initializeSelectedWorld() {
  const result =
    resolveWorldNow();

  if (!result.ok) {
    console.error("");

    console.error(
      "============================================================",
    );

    console.error(
      " REBEL PALWORLD WORLD SELECTION REQUIRED",
    );

    console.error(
      "============================================================",
    );

    console.error("");

    console.error(
      result.error,
    );

    process.exit(1);
  }

  applyWorldSelection(
    result.resolution,
    {
      forceInitialSync:
        true,
    },
  );

  selectedWorldConfigSignature =
    getConfigSignature();
}

function checkWorldSelection() {
  const latestConfigSignature =
    getConfigSignature();

  if (
    latestConfigSignature ===
    selectedWorldConfigSignature
  ) {
    return;
  }

  selectedWorldConfigSignature =
    latestConfigSignature;

  const result =
    resolveWorldNow();

  if (!result.ok) {
    lastError =
      result.error;

    writeWatcherStatus({
      status:
        "error",

      error:
        lastError,
    });

    console.error("");

    console.error(
      `[${timestamp()}] WORLD SWITCH FAILED: ${lastError}`,
    );

    return;
  }

  const newWorld =
    result.resolution
      .selectedWorld;

  const sameWorld =
    selectedWorld &&
    selectedWorld.worldId ===
      newWorld.worldId &&
    selectedWorld.steamAccountId ===
      newWorld.steamAccountId;

  if (sameWorld) {
    return;
  }

  if (syncing) {
    syncRequestedWhileBusy =
      true;

    worldResolution =
      result.resolution;

    selectedWorld =
      newWorld;

    liveSavePath =
      newWorld.levelSavPath;

    lastImportedSignature =
      null;

    candidateSignature =
      null;

    candidateSince =
      null;

    return;
  }

  applyWorldSelection(
    result.resolution,
    {
      forceInitialSync:
        true,
    },
  );

  checkSave();
}

// ------------------------------------------------------------
// LIVE SAVE COPY
// ------------------------------------------------------------
//
// The live Palworld save remains READ ONLY.
//
// Rebel copies Level.sav to:
//
// tools/pal-save-import/working/Level.sav
//
// and processes only that copy.
//
// ------------------------------------------------------------

async function copyLiveSave() {
  fs.mkdirSync(
    workingDirectory,
    {
      recursive: true,
    },
  );

  await fs.promises.copyFile(
    liveSavePath,
    workingSavePath,
  );
}

async function convertSave() {
  await runCommand(
    pythonPath,
    [
      "-m",
      "palsav.cli",
      "convert",

      workingSavePath,

      "--output",
      levelJsonPath,

      "--force",
    ],
    {
      cwd:
        pstDirectory,

      env: {
        ...process.env,

        PYTHONPATH:
          palsavSourcePath,
      },
    },
  );
}

async function runNodeScript(
  scriptPath,
) {
  await runCommand(
    process.execPath,
    [
      scriptPath,
    ],
    {
      cwd:
        projectRoot,
    },
  );
}

// ------------------------------------------------------------
// SYNC
// ------------------------------------------------------------

async function syncSave(
  expectedSignature,
) {
  if (syncing) {
    syncRequestedWhileBusy =
      true;

    return;
  }

  syncing =
    true;

  writeWatcherStatus({
    status:
      "syncing",

    error:
      null,

    signature:
      expectedSignature,
  });

  console.log("");

  console.log(
    "============================================================",
  );

  log(
    "PALWORLD SAVE CHANGE DETECTED",
  );

  console.log(
    "============================================================",
  );

  const startedAt =
    Date.now();

  try {
    log(
      "1/5 Copying live Level.sav...",
    );

    await copyLiveSave();

    log(
      "2/5 Converting Level.sav -> level.json...",
    );

    await convertSave();

    log(
      "3/5 Extracting owned Pals...",
    );

    await runNodeScript(
      extractScript,
    );

    log(
      "4/5 Normalizing Pal data...",
    );

    await runNodeScript(
      normalizeScript,
    );

    log(
      "5/5 Building Rebel app data...",
    );

    await runNodeScript(
      buildScript,
    );

    lastDurationMs =
      Date.now() -
      startedAt;

    lastSuccessfulSyncAt =
      new Date()
        .toISOString();

    lastPalCount =
      getGeneratedPalCount();

    lastImportedSignature =
      expectedSignature;

    lastError =
      null;

    writeWatcherStatus({
      status:
        "live",

      error:
        null,

      signature:
        expectedSignature,
    });

    if (
      fs.existsSync(
        cloudSyncConfigPath,
      )
    ) {
      log(
        "Uploading processed snapshot to Rebel Cloud...",
      );

      try {
        await runNodeScript(
          cloudSyncScript,
        );
      } catch (
        cloudError
      ) {
        console.error(
          `[${timestamp()}] CLOUD SNAPSHOT UPLOAD FAILED`,
        );

        console.error(
          cloudError,
        );

        console.error(
          "Local save processing succeeded and will continue normally.",
        );
      }
    }

    const durationSeconds =
      (
        lastDurationMs /
        1000
      ).toFixed(1);

    console.log("");

    console.log(
      "============================================================",
    );

    log(
      `REBEL SYNC COMPLETE in ${durationSeconds}s`,
    );

    console.log(
      "============================================================",
    );

    console.log("");
  } catch (error) {
    lastDurationMs =
      Date.now() -
      startedAt;

    lastError =
      error instanceof Error
        ? error.message
        : String(error);

    lastImportedSignature =
      null;

    writeWatcherStatus({
      status:
        "error",

      error:
        lastError,

      signature:
        expectedSignature,
    });

    console.error("");

    console.error(
      "============================================================",
    );

    console.error(
      `[${timestamp()}] REBEL SYNC FAILED`,
    );

    console.error(
      "============================================================",
    );

    console.error(
      error,
    );

    console.error("");
  } finally {
    syncing =
      false;

    if (
      syncRequestedWhileBusy
    ) {
      syncRequestedWhileBusy =
        false;

      checkWorldSelection();

      const latest =
        getSaveInfo();

      if (
        latest &&
        latest.signature !==
          lastImportedSignature
      ) {
        candidateSignature =
          latest.signature;

        candidateSince =
          Date.now() -
          SAVE_SETTLE_TIME_MS;
      }
    }
  }
}

// ------------------------------------------------------------
// WATCH
// ------------------------------------------------------------

function checkSave() {
  if (!liveSavePath) {
    return;
  }

  const save =
    getSaveInfo();

  if (!save) {
    writeWatcherStatus({
      status:
        "error",

      error:
        "Could not read the selected Palworld Level.sav.",
    });

    return;
  }

  if (
    save.signature ===
    lastImportedSignature
  ) {
    candidateSignature =
      null;

    candidateSince =
      null;

    return;
  }

  if (
    save.signature !==
    candidateSignature
  ) {
    candidateSignature =
      save.signature;

    candidateSince =
      Date.now();

    return;
  }

  const stableFor =
    Date.now() -
    candidateSince;

  if (
    stableFor <
    SAVE_SETTLE_TIME_MS
  ) {
    return;
  }

  if (syncing) {
    syncRequestedWhileBusy =
      true;

    return;
  }

  const signatureToImport =
    candidateSignature;

  candidateSignature =
    null;

  candidateSince =
    null;

  void syncSave(
    signatureToImport,
  );
}

// ------------------------------------------------------------
// SETUP
// ------------------------------------------------------------

function verifySetup() {
  const requiredPaths = [
    {
      label:
        "PST Python",

      value:
        pythonPath,
    },

    {
      label:
        "Palsav source",

      value:
        palsavSourcePath,
    },

    {
      label:
        "extract-pals.mjs",

      value:
        extractScript,
    },

    {
      label:
        "normalize-pals.mjs",

      value:
        normalizeScript,
    },

    {
      label:
        "build-app-data.mjs",

      value:
        buildScript,
    },

    {
      label:
        "sync-cloud-snapshot.mjs",

      value:
        cloudSyncScript,
    },
  ];

  let valid =
    true;

  for (
    const item
    of requiredPaths
  ) {
    if (
      !fs.existsSync(
        item.value,
      )
    ) {
      console.error(
        `MISSING: ${item.label}`,
      );

      console.error(
        `         ${item.value}`,
      );

      valid =
        false;
    }
  }

  if (!valid) {
    process.exit(1);
  }
}

// ------------------------------------------------------------
// START
// ------------------------------------------------------------

verifySetup();

const previousStatus =
  readPreviousStatus();

if (previousStatus) {
  lastSuccessfulSyncAt =
    previousStatus
      .lastSyncAt ??
    null;

  lastDurationMs =
    previousStatus
      .durationMs ??
    null;

  lastPalCount =
    previousStatus
      .palCount ??
    null;
}

initializeSelectedWorld();

const initialSave =
  getSaveInfo();

if (!initialSave) {
  writeWatcherStatus({
    status:
      "error",

    error:
      "Could not read the selected Palworld Level.sav.",
  });

  console.error(
    "Could not read the selected Palworld Level.sav.",
  );

  process.exit(1);
}

console.log("");

console.log(
  "============================================================",
);

console.log(
  " REBEL PALWORLD LIVE SYNC",
);

console.log(
  "============================================================",
);

console.log("");

console.log(
  `World selection: ${worldResolution.status}`,
);

console.log("");

console.log(
  `Steam account: ${selectedWorld.steamAccountId}`,
);

console.log(
  `World ID:      ${selectedWorld.worldId}`,
);

console.log("");

console.log(
  "Watching:",
);

console.log(
  liveSavePath,
);

console.log("");

console.log(
  `Current save size: ${initialSave.size.toLocaleString()} bytes`,
);

console.log("");

console.log(
  "LIVE SAVE MODE: READ ONLY",
);

console.log(
  "Rebel processes a copied working save only.",
);

console.log("");

console.log(
  "Waiting for Palworld save changes...",
);

console.log(
  "Press Ctrl+C to stop the watcher.",
);

console.log("");

checkSave();

const saveWatchTimer =
  setInterval(
    checkSave,
    POLL_INTERVAL_MS,
  );

const worldConfigTimer =
  setInterval(
    checkWorldSelection,
    WORLD_CONFIG_POLL_INTERVAL_MS,
  );

const heartbeatTimer =
  setInterval(
    () => {
      if (!syncing) {
        writeWatcherStatus();
      }
    },
    HEARTBEAT_INTERVAL_MS,
  );

// ------------------------------------------------------------
// SHUTDOWN
// ------------------------------------------------------------

function stopWatcher() {
  clearInterval(
    saveWatchTimer,
  );

  clearInterval(
    worldConfigTimer,
  );

  clearInterval(
    heartbeatTimer,
  );

  writeWatcherStatus({
    status:
      "stopped",

    error:
      null,
  });

  console.log("");

  log(
    "Rebel Palworld watcher stopped.",
  );

  process.exit(0);
}

process.on(
  "SIGINT",
  stopWatcher,
);

process.on(
  "SIGTERM",
  stopWatcher,
);