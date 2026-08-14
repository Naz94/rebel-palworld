import "dotenv/config";

import pino from "pino";

import { PalworldClient } from "./palworld-client.js";
import { RebelClient } from "./rebel-client.js";

const logger = pino();

const POLL_INTERVAL_MS = 10_000;

async function collectTelemetry(
  palworld: PalworldClient,
  rebel: RebelClient,
) {
  try {
    const [info, metrics] = await Promise.all([
      palworld.getServerInfo(),
      palworld.getServerMetrics(),
    ]);

    await rebel.sendHeartbeat(info, metrics);

    logger.info(
      {
        server: {
          name: info.servername,
          version: info.version,
          worldGuid: info.worldguid,
        },

        metrics: {
          fps: metrics.serverfps,
          playersOnline: metrics.currentplayernum,
          maxPlayers: metrics.maxplayernum,
          uptime: metrics.uptime,
          bases: metrics.basecampnum,
          inGameDay: metrics.inGameDay ?? null,
        },
      },
      "Heartbeat sent",
    );
  } catch (error) {
    logger.warn(
      {
        err: error,
      },
      "Telemetry cycle failed",
    );
  }
}

async function main() {
  logger.info(
    {
      service: "rebel-palworld-connector",
      environment: process.env.NODE_ENV ?? "development",
      pollIntervalMs: POLL_INTERVAL_MS,
    },
    "Rebel Palworld Connector started",
  );

  const palworld = new PalworldClient();
  const rebel = new RebelClient();

  await collectTelemetry(palworld, rebel);

  setInterval(() => {
    void collectTelemetry(palworld, rebel);
  }, POLL_INTERVAL_MS);
}

main().catch((error) => {
  logger.fatal(
    {
      err: error,
    },
    "Connector crashed",
  );

  process.exit(1);
});