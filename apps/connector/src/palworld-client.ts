import { env } from "./env.js";

export type PalworldServerInfo = {
  version: string;
  servername: string;
  description: string;
  worldguid: string;
};

export type PalworldServerMetrics = {
  serverfps: number;
  currentplayernum: number;
  serverframetime: number;
  maxplayernum: number;
  uptime: number;
  basecampnum: number;
  inGameDay: number;
};

export class PalworldClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.PALWORLD_API_URL.replace(/\/$/, "");
  }

  private getAuthorizationHeader(): string {
    const credentials = Buffer.from(
      `${env.PALWORLD_USERNAME}:${env.PALWORLD_PASSWORD}`,
    ).toString("base64");

    return `Basic ${credentials}`;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}${path}`,
      {
        method: "GET",
        headers: {
          Authorization: this.getAuthorizationHeader(),
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Palworld API returned ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  }

  async getServerInfo(): Promise<PalworldServerInfo> {
    return this.request<PalworldServerInfo>(
      "/v1/api/info",
    );
  }

  async getServerMetrics(): Promise<PalworldServerMetrics> {
    return this.request<PalworldServerMetrics>(
      "/v1/api/metrics",
    );
  }
}