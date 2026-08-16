import {
  createHash,
  randomBytes,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createClient,
} from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

type ProvisionBody = {
  serverId?: unknown;
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

export async function POST(
  request: NextRequest,
) {
  try {
    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase
        .auth
        .getUser();

    if (
      userError ||
      !user
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

    const body =
      (await request.json()) as
        ProvisionBody;

    if (
      typeof body.serverId !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request",
        },
        {
          status: 400,
        },
      );
    }

    const admin =
      createAdminClient();

    const {
      data:
        server,
      error:
        serverError,
    } =
      await admin
        .from(
          "servers",
        )
        .select(
          "id, owner_id",
        )
        .eq(
          "id",
          body.serverId,
        )
        .eq(
          "owner_id",
          user.id,
        )
        .maybeSingle();

    if (
      serverError
    ) {
      console.error(
        "SERVER OWNERSHIP ERROR:",
        serverError,
      );

      return NextResponse.json(
        {
          error:
            "Could not verify server ownership",
        },
        {
          status: 500,
        },
      );
    }

    if (!server) {
      return NextResponse.json(
        {
          error:
            "Server not found",
        },
        {
          status: 404,
        },
      );
    }

    const {
      data:
        existingConnector,
      error:
        existingConnectorError,
    } =
      await admin
        .from(
          "connectors",
        )
        .select(
          "id",
        )
        .eq(
          "server_id",
          body.serverId,
        )
        .maybeSingle();

    if (
      existingConnectorError
    ) {
      return NextResponse.json(
        {
          error:
            "Could not inspect connector",
        },
        {
          status: 500,
        },
      );
    }

    let connectorId:
      string;

    if (
      existingConnector
    ) {
      connectorId =
        existingConnector.id;
    } else {
      const {
        data:
          newConnector,
        error:
          createConnectorError,
      } =
        await admin
          .from(
            "connectors",
          )
          .insert({
            server_id:
              body.serverId,

            status:
              "offline",
          })
          .select(
            "id",
          )
          .single();

      if (
        createConnectorError ||
        !newConnector
      ) {
        return NextResponse.json(
          {
            error:
              "Could not create connector",
          },
          {
            status: 500,
          },
        );
      }

      connectorId =
        newConnector.id;
    }

    const rawToken =
      randomBytes(
        32,
      ).toString(
        "base64url",
      );

    const tokenHash =
      hashToken(
        rawToken,
      );

    const {
      error:
        deleteError,
    } =
      await admin
        .from(
          "connector_credentials",
        )
        .delete()
        .eq(
          "connector_id",
          connectorId,
        );

    if (
      deleteError
    ) {
      return NextResponse.json(
        {
          error:
            "Could not rotate connector credential",
        },
        {
          status: 500,
        },
      );
    }

    const {
      error:
        credentialError,
    } =
      await admin
        .from(
          "connector_credentials",
        )
        .insert({
          connector_id:
            connectorId,

          token_hash:
            tokenHash,
        });

    if (
      credentialError
    ) {
      return NextResponse.json(
        {
          error:
            "Could not create connector credential",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        connectorId,
        serverId:
          body.serverId,

        token:
          rawToken,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "CONNECTOR PROVISION ERROR:",
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
