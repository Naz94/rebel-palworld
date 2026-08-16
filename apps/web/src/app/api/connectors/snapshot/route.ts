import {
  createHash,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const MAX_SNAPSHOT_BYTES =
  4_000_000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SnapshotBody = {
  serverId?: unknown;
  schemaVersion?: unknown;
  entities?: unknown;
  watcher?: unknown;
  worldId?: unknown;
  saveSignature?: unknown;
  saveModifiedAt?: unknown;
};

function hashToken(
  token: string,
): string {
  return createHash(
    "sha256",
  )
    .update(token)
    .digest("hex");
}

function optionalString(
  value: unknown,
  maxLength: number,
): string | null {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  if (
    !trimmed ||
    trimmed.length >
      maxLength
  ) {
    return null;
  }

  return trimmed;
}

export async function POST(
  request: NextRequest,
) {
  try {
    const authorization =
      request.headers.get(
        "authorization",
      );

    if (
      !authorization?.startsWith(
        "Bearer ",
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const rawToken =
      authorization
        .slice(
          "Bearer ".length,
        )
        .trim();

    if (!rawToken) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const rawBody =
      await request.text();

    if (
      Buffer.byteLength(
        rawBody,
        "utf8",
      ) >
      MAX_SNAPSHOT_BYTES
    ) {
      return NextResponse.json(
        {
          error:
            "Snapshot is too large",
        },
        {
          status: 413,
        },
      );
    }

    let body:
      SnapshotBody;

    try {
      body =
        JSON.parse(
          rawBody,
        ) as SnapshotBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON",
        },
        {
          status: 400,
        },
      );
    }

    if (
      typeof body.serverId !==
        "string" ||
      !UUID_PATTERN.test(
        body.serverId,
      ) ||
      !Array.isArray(
        body.entities,
      ) ||
      body.entities.length >
        5000
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid snapshot",
        },
        {
          status: 400,
        },
      );
    }

    const schemaVersion =
      typeof body.schemaVersion ===
        "number" &&
      Number.isInteger(
        body.schemaVersion,
      ) &&
      body.schemaVersion >= 1
        ? body.schemaVersion
        : 1;

    const watcher =
      body.watcher &&
      typeof body.watcher ===
        "object" &&
      !Array.isArray(
        body.watcher,
      )
        ? body.watcher
        : {};

    const admin =
      createAdminClient();

    const tokenHash =
      hashToken(
        rawToken,
      );

    const {
      data:
        credential,
      error:
        credentialError,
    } =
      await admin
        .from(
          "connector_credentials",
        )
        .select(
          `
            connector_id,
            revoked_at,
            connectors!inner (
              id,
              server_id
            )
          `,
        )
        .eq(
          "token_hash",
          tokenHash,
        )
        .is(
          "revoked_at",
          null,
        )
        .maybeSingle();

    if (
      credentialError ||
      !credential
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const connectorRelation =
      credential.connectors;

    const connector =
      Array.isArray(
        connectorRelation,
      )
        ? connectorRelation[0]
        : connectorRelation;

    if (
      !connector ||
      connector.server_id !==
        body.serverId
    ) {
      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    const now =
      new Date()
        .toISOString();

    const worldId =
      optionalString(
        body.worldId,
        200,
      );

    const saveSignature =
      optionalString(
        body.saveSignature,
        300,
      );

    const saveModifiedAt =
      optionalString(
        body.saveModifiedAt,
        100,
      );

    const {
      error:
        snapshotError,
    } =
      await admin
        .from(
          "pal_snapshots",
        )
        .upsert(
          {
            server_id:
              body.serverId,

            connector_id:
              connector.id,

            schema_version:
              schemaVersion,

            entities:
              body.entities,

            watcher,

            pal_count:
              body.entities.length,

            world_id:
              worldId,

            save_signature:
              saveSignature,

            save_modified_at:
              saveModifiedAt,

            synced_at:
              now,
          },
          {
            onConflict:
              "server_id",
          },
        );

    if (
      snapshotError
    ) {
      console.error(
        "SNAPSHOT UPSERT ERROR:",
        snapshotError,
      );

      return NextResponse.json(
        {
          error:
            "Could not store snapshot",
        },
        {
          status: 500,
        },
      );
    }

    await Promise.all([
      admin
        .from(
          "connectors",
        )
        .update({
          status:
            "online",

          last_heartbeat_at:
            now,

          updated_at:
            now,
        })
        .eq(
          "id",
          connector.id,
        ),

      admin
        .from(
          "servers",
        )
        .update({
          status:
            "online",

          last_seen_at:
            now,

          updated_at:
            now,
        })
        .eq(
          "id",
          body.serverId,
        ),
    ]);

    return NextResponse.json(
      {
        ok: true,
        palCount:
          body.entities.length,
        syncedAt:
          now,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "SNAPSHOT ROUTE ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}
