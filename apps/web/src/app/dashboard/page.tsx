import Link from "next/link";
import { redirect } from "next/navigation";

import AddServerForm from "./add-server-form";
import ConnectServerButton from "./connect-server-button";
import SignOutButton from "./sign-out-button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const {
    data: servers,
    error: serversError,
  } = await supabase
    .from("servers")
    .select("id, name, server_type, status, last_seen_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-white/10 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                Rebel Palworld
              </p>

              <h1 className="mt-3 text-3xl font-semibold">
                Dashboard
              </h1>

              <p className="mt-2 text-neutral-400">
                Signed in as {user.email}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/pals"
                className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
              >
                View My Pals
              </Link>

              <SignOutButton />
            </div>
          </div>
        </header>

        <section className="mt-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold">
                Your Servers
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                Manage your Palworld servers.
              </p>
            </div>

            <AddServerForm userId={user.id} />
          </div>

          {serversError && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
              Could not load servers: {serversError.message}
            </div>
          )}

          {!serversError && servers?.length === 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8">
              <p className="text-neutral-400">
                No servers connected yet.
              </p>
            </div>
          )}

          {!serversError && servers && servers.length > 0 && (
            <div className="mt-6 grid gap-4">
              {servers.map((server) => (
                <div
                  key={server.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {server.name}
                      </h3>

                      <p className="mt-1 text-sm text-neutral-500">
                        {server.server_type}
                      </p>

                      <ConnectServerButton
                        serverId={server.id}
                      />
                    </div>

                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-neutral-400">
                      {server.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}