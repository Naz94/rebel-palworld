"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ConnectServerButtonProps = {
  serverId: string;
};

export default function ConnectServerButton({
  serverId,
}: ConnectServerButtonProps) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    setToken(null);

    const supabase = createClient();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      setError("You are not signed in.");
      setLoading(false);
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      setError("Missing API configuration.");
      setLoading(false);
      return;
    }

    const response = await fetch(
      `${apiUrl}/connectors/provision`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverId,
        }),
      },
    );

    const body = (await response.json()) as {
      token?: string;
      error?: string;
    };

    if (!response.ok || !body.token) {
      setError(body.error ?? "Could not provision connector.");
      setLoading(false);
      return;
    }

    setToken(body.token);
    setLoading(false);
  }

  return (
    <div className="mt-4">
      {!token && (
        <button
          type="button"
          onClick={handleConnect}
          disabled={loading}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-neutral-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          {loading ? "Provisioning..." : "Connect Server"}
        </button>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {token && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-medium text-white">
            Connector token created
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Copy this once into the connector configuration. It will not be shown again.
          </p>

          <code className="mt-3 block break-all rounded-lg bg-black/40 p-3 text-xs text-neutral-300">
            {token}
          </code>
        </div>
      )}
    </div>
  );
}