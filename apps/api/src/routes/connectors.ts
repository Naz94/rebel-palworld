import { createHash, randomBytes } from "node:crypto";

import { Router } from "express";
import { z } from "zod";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { adminSupabase } from "../lib/admin-supabase.js";

export const connectorsRouter = Router();

const provisionSchema = z.object({
  serverId: z.string().uuid(),
});

const heartbeatSchema = z.object({
  serverId: z.string().uuid(),

  connectorVersion: z.string().min(1).max(50).optional(),

  server: z.object({
    name: z.string().min(1).max(100),
    version: z.string().min(1).max(100),
    worldGuid: z.string().min(1).max(200),
  }),

  metrics: z.object({
    fps: z.number().finite().nonnegative().optional(),
    frameTime: z.number().finite().nonnegative().optional(),
    playersOnline: z.number().int().nonnegative().optional(),
    maxPlayers: z.number().int().nonnegative().optional(),
    uptime: z.number().int().nonnegative().optional(),
    bases: z.number().int().nonnegative().optional(),
    inGameDay: z.number().int().nonnegative().nullable().optional(),
  }),
});

function hashToken(token: string): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * POST /connectors/provision
 *
 * Called by a logged-in dashboard user.
 *
 * Creates or replaces the connector credential belonging
 * to one of that user's servers.
 */
connectorsRouter.post(
  "/provision",
  requireAuth,
  async (req, res) => {
    const user = (req as AuthenticatedRequest).user;

    const parsed = provisionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request",
      });
    }

    const { serverId } = parsed.data;

    // Verify that the authenticated user actually owns this server.
    const {
      data: server,
      error: serverError,
    } = await adminSupabase
      .from("servers")
      .select("id, owner_id")
      .eq("id", serverId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (serverError) {
      console.error("SERVER OWNERSHIP ERROR:", serverError);

      return res.status(500).json({
        error: "Could not verify server ownership",
      });
    }

    if (!server) {
      return res.status(404).json({
        error: "Server not found",
      });
    }

    // Make sure a connector row exists for this server.
    const {
      data: existingConnector,
      error: existingConnectorError,
    } = await adminSupabase
      .from("connectors")
      .select("id")
      .eq("server_id", serverId)
      .maybeSingle();

    if (existingConnectorError) {
      console.error(
        "CONNECTOR INSPECTION ERROR:",
        existingConnectorError,
      );

      return res.status(500).json({
        error: "Could not inspect connector",
      });
    }

    let connectorId: string;

    if (existingConnector) {
      connectorId = existingConnector.id;
    } else {
      const {
        data: newConnector,
        error: createConnectorError,
      } = await adminSupabase
        .from("connectors")
        .insert({
          server_id: serverId,
          status: "offline",
        })
        .select("id")
        .single();

      if (createConnectorError || !newConnector) {
        console.error(
          "CREATE CONNECTOR ERROR:",
          createConnectorError,
        );

        return res.status(500).json({
          error: "Could not create connector",
        });
      }

      connectorId = newConnector.id;
    }

    // 32 random bytes = 256 bits of entropy.
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(rawToken);

    // Replace old credential if this connector was provisioned before.
    const {
      error: deleteCredentialError,
    } = await adminSupabase
      .from("connector_credentials")
      .delete()
      .eq("connector_id", connectorId);

    if (deleteCredentialError) {
      console.error(
        "DELETE CONNECTOR CREDENTIAL ERROR:",
        deleteCredentialError,
      );

      return res.status(500).json({
        error: "Could not rotate connector credential",
      });
    }

    const {
      error: credentialError,
    } = await adminSupabase
      .from("connector_credentials")
      .insert({
        connector_id: connectorId,
        token_hash: tokenHash,
      });

    if (credentialError) {
      console.error(
        "CREATE CONNECTOR CREDENTIAL ERROR:",
        credentialError,
      );

      return res.status(500).json({
        error: "Could not create connector credential",
      });
    }

    return res.status(201).json({
      connectorId,

      // This is the ONLY time the raw token is returned.
      token: rawToken,
    });
  },
);

/**
 * POST /connectors/heartbeat
 *
 * Called by the Rebel Connector.
 *
 * Authentication is done with:
 *
 * Authorization: Bearer <connector token>
 */
connectorsRouter.post(
  "/heartbeat",
  async (req, res) => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const rawToken = authorization
      .slice("Bearer ".length)
      .trim();

    if (!rawToken) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const parsed = heartbeatSchema.safeParse(req.body);

    if (!parsed.success) {
      console.error(
        "INVALID HEARTBEAT:",
        parsed.error.flatten(),
      );

      return res.status(400).json({
        error: "Invalid heartbeat",
      });
    }

    const tokenHash = hashToken(rawToken);

    const {
      data: credential,
      error: credentialError,
    } = await adminSupabase
      .from("connector_credentials")
      .select(`
        connector_id,
        revoked_at,
        connectors!inner (
          id,
          server_id
        )
      `)
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();

    if (credentialError) {
      console.error(
        "HEARTBEAT CREDENTIAL LOOKUP ERROR:",
        credentialError,
      );

      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    if (!credential) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const connectorRelation = credential.connectors;

    const connector = Array.isArray(connectorRelation)
      ? connectorRelation[0]
      : connectorRelation;

    if (!connector) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const heartbeat = parsed.data;

    // A connector token is tied to exactly one server.
    if (heartbeat.serverId !== connector.server_id) {
      return res.status(403).json({
        error: "Forbidden",
      });
    }

    const now = new Date().toISOString();

    const {
      error: connectorUpdateError,
    } = await adminSupabase
      .from("connectors")
      .update({
        status: "online",
        version: heartbeat.connectorVersion ?? null,
        last_heartbeat_at: now,
        updated_at: now,
      })
      .eq("id", connector.id);

    if (connectorUpdateError) {
      console.error(
        "CONNECTOR UPDATE ERROR:",
        connectorUpdateError,
      );

      return res.status(500).json({
        error: "Could not update connector",
      });
    }

    const {
      error: serverUpdateError,
    } = await adminSupabase
      .from("servers")
      .update({
        status: "online",
        last_seen_at: now,
        updated_at: now,
      })
      .eq("id", connector.server_id);

    if (serverUpdateError) {
      console.error(
        "SERVER UPDATE ERROR:",
        serverUpdateError,
      );

      return res.status(500).json({
        error: "Could not update server",
      });
    }

    const {
      error: telemetryError,
    } = await adminSupabase
      .from("server_telemetry")
      .insert({
        server_id: connector.server_id,

        server_fps: heartbeat.metrics.fps ?? null,
        server_frame_time:
          heartbeat.metrics.frameTime ?? null,

        players_online:
          heartbeat.metrics.playersOnline ?? null,

        max_players:
          heartbeat.metrics.maxPlayers ?? null,

        uptime_seconds:
          heartbeat.metrics.uptime ?? null,

        base_count:
          heartbeat.metrics.bases ?? null,

        in_game_day:
          heartbeat.metrics.inGameDay ?? null,

        server_version:
          heartbeat.server.version,

        world_guid:
          heartbeat.server.worldGuid,
      });

    if (telemetryError) {
      console.error(
        "TELEMETRY INSERT ERROR:",
        telemetryError,
      );

      return res.status(500).json({
        error: "Could not store telemetry",
      });
    }

    return res.status(200).json({
      status: "ok",
    });
  },
);