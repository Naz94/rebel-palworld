"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type DiscoveredWorld = {
  steamAccountId: string;
  accountLooksValid: boolean;

  worldId: string;
  worldIdLooksValid: boolean;

  worldPath: string;
  levelSavPath: string;

  levelSavSize: number;

  lastModifiedAt: string;
  lastModifiedMs: number;

  hasLevelMeta: boolean;
  hasLocalData: boolean;
  hasWorldOption: boolean;
  hasPlayersFolder: boolean;

  selected: boolean;
};

type WorldsResponse = {
  detected: boolean;

  saveRoot:
    string | null;

  worldCount:
    number;

  selectedWorldId:
    string | null;

  selectedSteamAccountId:
    string | null;

  worlds:
    DiscoveredWorld[];

  generatedAt:
    string;

  error?:
    string;
};

type SelectWorldResponse = {
  ok:
    boolean;

  message?:
    string;

  error?:
    string;
};

export default function WorldsPage() {
  const [
    data,
    setData,
  ] =
    useState<WorldsResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    connectingKey,
    setConnectingKey,
  ] =
    useState<string | null>(
      null,
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<string | null>(
      null,
    );

  const loadWorlds =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `/api/worlds?t=${Date.now()}`,
              {
                cache:
                  "no-store",
              },
            );

          const payload =
            (await response.json()) as WorldsResponse;

          if (!response.ok) {
            throw new Error(
              payload.error ??
                `World discovery failed with ${response.status}`,
            );
          }

          setData(
            payload,
          );

          setError(
            null,
          );
        } catch (
          fetchError
        ) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : String(
                  fetchError,
                ),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  const connectWorld =
    useCallback(
      async (
        world: DiscoveredWorld,
      ) => {
        const key =
          `${world.steamAccountId}:${world.worldId}`;

        setConnectingKey(
          key,
        );

        setError(
          null,
        );

        setSuccessMessage(
          null,
        );

        try {
          const response =
            await fetch(
              "/api/worlds",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    steamAccountId:
                      world.steamAccountId,

                    worldId:
                      world.worldId,
                  }),
              },
            );

          const payload =
            (await response.json()) as SelectWorldResponse;

          if (
            !response.ok ||
            !payload.ok
          ) {
            throw new Error(
              payload.error ??
                "Could not connect the selected world.",
            );
          }

          setSuccessMessage(
            "World connected. Rebel saved the new world selection.",
          );

          await loadWorlds();
        } catch (
          connectError
        ) {
          setError(
            connectError instanceof Error
              ? connectError.message
              : String(
                  connectError,
                ),
          );
        } finally {
          setConnectingKey(
            null,
          );
        }
      },
      [
        loadWorlds,
      ],
    );

  useEffect(
    () => {
      void loadWorlds();

      const timer =
        window.setInterval(
          () => {
            void loadWorlds();
          },
          10000,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      loadWorlds,
    ],
  );

  return (
    <main className="min-h-screen bg-[#090b0e] text-white">
      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
        <header className="border-b border-white/10 pb-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                Rebel Palworld
              </p>

              <h1 className="mt-3 text-3xl font-semibold">
                Palworld Worlds
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                Rebel automatically discovers local Palworld worlds
                without modifying your save data.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoading(
                    true,
                  );

                  void loadWorlds();
                }}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-neutral-400 transition hover:bg-white/5 hover:text-white"
              >
                Rescan
              </button>

              <Link
                href="/world"
                className="rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
              >
                World Overview
              </Link>
            </div>
          </div>
        </header>

        {loading &&
          !data && (
            <section className="mt-8 rounded-2xl border border-white/10 bg-[#12161b] p-8">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />

                <p className="text-sm text-neutral-400">
                  Scanning for Palworld worlds...
                </p>
              </div>
            </section>
          )}

        {error && (
          <section className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-5">
            <p className="text-sm font-medium text-red-300">
              Rebel encountered a world-selection error
            </p>

            <p className="mt-2 text-xs text-red-300/70">
              {error}
            </p>
          </section>
        )}

        {successMessage && (
          <section className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-5">
            <p className="text-sm font-medium text-emerald-300">
              {successMessage}
            </p>
          </section>
        )}

        {data && (
          <>
            <section className="mt-8 grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Palworld"
                value={
                  data.detected
                    ? "Detected"
                    : "Not Found"
                }
                description={
                  data.detected
                    ? "Local save directory found"
                    : "No compatible saves detected"
                }
                live={
                  data.detected
                }
              />

              <MetricCard
                label="Worlds Found"
                value={String(
                  data.worldCount,
                )}
                description="Local worlds with Level.sav"
              />

              <MetricCard
                label="Connected"
                value={
                  data.selectedWorldId
                    ? "Yes"
                    : "No"
                }
                description={
                  data.selectedWorldId
                    ? "A world is selected"
                    : "Choose a world below"
                }
                live={
                  Boolean(
                    data.selectedWorldId,
                  )
                }
              />
            </section>

            <section className="mt-10">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                    Local Discovery
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    Available worlds
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    {data.worldCount === 1
                      ? "1 Palworld world was found on this computer."
                      : `${data.worldCount} Palworld worlds were found on this computer.`}
                  </p>
                </div>

                {loading && (
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-600">
                    Rescanning...
                  </p>
                )}
              </div>

              {data.worlds.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-[#12161b] p-8">
                  <h3 className="text-lg font-semibold">
                    No worlds found
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-500">
                    Rebel could not find a Palworld world containing a
                    valid Level.sav in the normal Windows save
                    location.
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  {data.worlds.map(
                    (
                      world,
                      index,
                    ) => {
                      const key =
                        `${world.steamAccountId}:${world.worldId}`;

                      return (
                        <WorldCard
                          key={
                            key
                          }
                          world={
                            world
                          }
                          index={
                            index
                          }
                          connecting={
                            connectingKey ===
                            key
                          }
                          onConnect={() => {
                            void connectWorld(
                              world,
                            );
                          }}
                        />
                      );
                    },
                  )}
                </div>
              )}
            </section>

            {data.saveRoot && (
              <section className="mt-8 rounded-2xl border border-white/[0.07] bg-black/20 p-5">
                <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-600">
                  Palworld Save Root
                </p>

                <p className="mt-2 break-all font-mono text-[10px] text-neutral-500">
                  {
                    data.saveRoot
                  }
                </p>

                <p className="mt-3 text-[10px] leading-relaxed text-neutral-600">
                  Rebel scans this directory in read-only mode.
                  Save files are copied into Rebel&apos;s private
                  working directory before processing.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function WorldCard({
  world,
  index,
  connecting,
  onConnect,
}: {
  world:
    DiscoveredWorld;

  index:
    number;

  connecting:
    boolean;

  onConnect:
    () => void;
}) {
  const checks = [
    {
      label:
        "Level.sav",

      ok:
        true,
    },

    {
      label:
        "LevelMeta",

      ok:
        world.hasLevelMeta,
    },

    {
      label:
        "LocalData",

      ok:
        world.hasLocalData,
    },

    {
      label:
        "WorldOption",

      ok:
        world.hasWorldOption,
    },

    {
      label:
        "Players",

      ok:
        world.hasPlayersFolder,
    },
  ];

  return (
    <article
      className={`overflow-hidden rounded-2xl border ${
        world.selected
          ? "border-emerald-500/25 bg-emerald-500/[0.035]"
          : "border-white/10 bg-[#12161b]"
      }`}
    >
      <div className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[9px] uppercase tracking-[0.22em] text-neutral-600">
                World{" "}
                {index + 1}
              </span>

              {world.selected && (
                <span className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  Connected
                </span>
              )}
            </div>

            <h3 className="mt-3 break-all font-mono text-lg font-semibold tracking-tight text-neutral-100">
              {shortWorldId(
                world.worldId,
              )}
            </h3>

            <p className="mt-2 text-xs text-neutral-500">
              Steam account{" "}
              <span className="font-mono text-neutral-400">
                {
                  world.steamAccountId
                }
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-3">
            <WorldMetric
              label="Last Played"
              value={formatDate(
                world.lastModifiedAt,
              )}
            />

            <WorldMetric
              label="Save Size"
              value={formatBytes(
                world.levelSavSize,
              )}
            />

            <WorldMetric
              label="Status"
              value={
                world.selected
                  ? "Connected"
                  : "Available"
              }
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {checks.map(
            (check) => (
              <SaveCheck
                key={
                  check.label
                }
                label={
                  check.label
                }
                ok={
                  check.ok
                }
              />
            ),
          )}
        </div>

        <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/20 p-4">
          <p className="text-[8px] uppercase tracking-[0.18em] text-neutral-600">
            Level.sav
          </p>

          <p className="mt-2 break-all font-mono text-[9px] leading-relaxed text-neutral-600">
            {
              world.levelSavPath
            }
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          {world.selected ? (
            <Link
              href="/world"
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
            >
              Open World
            </Link>
          ) : (
            <button
              type="button"
              disabled={
                connecting
              }
              onClick={
                onConnect
              }
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-neutral-300 transition hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-50"
            >
              {connecting
                ? "Connecting..."
                : "Connect World"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function MetricCard({
  label,
  value,
  description,
  live = false,
}: {
  label:
    string;

  value:
    string;

  description:
    string;

  live?:
    boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#12161b] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-500">
          {label}
        </p>

        {live && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        )}
      </div>

      <p className="mt-3 text-xl font-semibold">
        {value}
      </p>

      <p className="mt-2 text-xs text-neutral-600">
        {description}
      </p>
    </div>
  );
}

function WorldMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.18em] text-neutral-600">
        {label}
      </p>

      <p className="mt-1 text-xs font-medium text-neutral-300">
        {value}
      </p>
    </div>
  );
}

function SaveCheck({
  label,
  ok,
}: {
  label:
    string;

  ok:
    boolean;
}) {
  return (
    <span
      className={`rounded-lg border px-2.5 py-1.5 text-[9px] ${
        ok
          ? "border-emerald-500/15 bg-emerald-500/[0.05] text-emerald-300/80"
          : "border-amber-500/15 bg-amber-500/[0.05] text-amber-300/80"
      }`}
    >
      {ok
        ? "✓"
        : "—"}{" "}
      {label}
    </span>
  );
}

function shortWorldId(
  worldId: string,
) {
  if (
    worldId.length <=
    16
  ) {
    return worldId;
  }

  return `${worldId.slice(
    0,
    8,
  )}…${worldId.slice(
    -8,
  )}`;
}

function formatDate(
  value: string,
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown";
  }

  const now =
    new Date();

  const sameDay =
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() ===
      now.getMonth() &&
    date.getDate() ===
      now.getDate();

  if (sameDay) {
    return `Today ${new Intl.DateTimeFormat(
      "en-ZA",
      {
        timeZone:
          "Africa/Johannesburg",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false,
      },
    ).format(date)}`;
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      timeZone:
        "Africa/Johannesburg",

      day:
        "2-digit",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        false,
    },
  ).format(date);
}

function formatBytes(
  bytes: number,
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}