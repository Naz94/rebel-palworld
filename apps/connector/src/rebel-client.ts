import { env } from "./env.js";
import type {
  PalworldServerInfo,
  PalworldServerMetrics,
} from "./palworld-client.js";

export class RebelClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.REBEL_API_URL.replace(/\/$/, "");
  }

  async sendHeartbeat(
    info: PalworldServerInfo,
    metrics: PalworldServerMetrics,
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/connectors/heartbeat`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.REBEL_CONNECTOR_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          serverId: env.REBEL_SERVER_ID,
          connectorVersion: "0.1.0",

          server: {
            name: info.servername,
            version: info.version,
            worldGuid: info.worldguid,
          },

          metrics: {
            fps: metrics.serverfps,
            frameTime: metrics.serverframetime,
            playersOnline: metrics.currentplayernum,
            maxPlayers: metrics.maxplayernum,
            uptime: metrics.uptime,
            bases: metrics.basecampnum,
            inGameDay: metrics.inGameDay ?? null,
          },
        }),
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      const text = await response.text();

      throw new Error(
        `Rebel API heartbeat failed: ${response.status} ${response.statusText} ${text}`,
      );
    }
  }
}