"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type RuntimeStatus =
  | "starting"
  | "syncing"
  | "live"
  | "stopped"
  | "error"
  | "offline";

type WorldState = {
  generatedAt: string;

  watcher: {
    status: RuntimeStatus;
    watcherPid: number | null;
    lastSyncAt: string | null;
    durationMs: number | null;
    palCount: number | null;
    saveSize: number | null;
    saveModifiedAt: string | null;
    signature: string | null;
    error: string | null;
    heartbeatAt: string | null;
    updatedAt: string | null;
    watcherAlive: boolean;
    heartbeatAgeMs: number | null;
  };

  collection: {
    ownedPals: number;
    species: number;
    coreKeep: number;
    usefulBackup: number;
    borderlineCleanup: number;
    safeCleanup: number;
    unknown: number;
  };

  locations: {
    partyCount: number;
    partyCapacity: number;
    palboxCount: number;
    palboxCapacity: number;

    bases: {
      baseIndex: number;
      count: number;
      capacity: number;
    }[];
  };

  party: {
    id: string | null;
    species: string;
    nickname: string | null;
    level: number | null;
    gender: string | null;
    slot: number | null;
  }[];
};

type BaseNames = Record<
  string,
  string
>;

type WorldPreferences = {
  ok: boolean;
  worldId: string;
  steamAccountId?: string;
  baseNames: BaseNames;
  updatedAt: string | null;
  error?: string;
};

const DEFAULT_BASE_NAMES: BaseNames = {
  "1": "Base 1",
  "2": "Base 2",
  "3": "Base 3",
};

export default function WorldPage() {
  const [state, setState] =
    useState<WorldState | null>(
      null,
    );

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const [baseNames, setBaseNames] =
    useState<BaseNames>(
      DEFAULT_BASE_NAMES,
    );

  const [editingBase, setEditingBase] =
    useState<number | null>(
      null,
    );

  const [baseNameDraft, setBaseNameDraft] =
    useState("");

  const [savingBaseName, setSavingBaseName] =
    useState(false);

  const [baseNameError, setBaseNameError] =
    useState<string | null>(
      null,
    );

  const fetchWorldPreferences =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `/api/world-preferences?t=${Date.now()}`,
              {
                cache:
                  "no-store",
              },
            );

          const preferences =
            (await response.json()) as WorldPreferences;

          if (!response.ok) {
            throw new Error(
              preferences.error ??
                `World preferences request failed with ${response.status}`,
            );
          }

          setBaseNames({
            ...DEFAULT_BASE_NAMES,
            ...preferences.baseNames,
          });

          setBaseNameError(
            null,
          );
        } catch (
          preferenceError
        ) {
          setBaseNameError(
            preferenceError instanceof Error
              ? preferenceError.message
              : String(
                  preferenceError,
                ),
          );
        }
      },
      [],
    );

  const fetchWorldState =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              `/api/world-state?t=${Date.now()}`,
              {
                cache:
                  "no-store",
              },
            );

          if (!response.ok) {
            throw new Error(
              `World state request failed with ${response.status}`,
            );
          }

          const nextState =
            (await response.json()) as WorldState;

          setState(
            nextState,
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
        }
      },
      [],
    );

  const startEditingBase =
    useCallback(
      (
        baseIndex: number,
      ) => {
        setEditingBase(
          baseIndex,
        );

        setBaseNameDraft(
          baseNames[
            String(
              baseIndex,
            )
          ] ??
            `Base ${baseIndex}`,
        );

        setBaseNameError(
          null,
        );
      },
      [
        baseNames,
      ],
    );

  const cancelEditingBase =
    useCallback(
      () => {
        setEditingBase(
          null,
        );

        setBaseNameDraft(
          "",
        );

        setBaseNameError(
          null,
        );
      },
      [],
    );

  const saveBaseName =
    useCallback(
      async (
        baseIndex: number,
      ) => {
        const cleanedName =
          baseNameDraft
            .trim()
            .slice(
              0,
              40,
            );

        if (!cleanedName) {
          setBaseNameError(
            "Base name cannot be empty.",
          );

          return;
        }

        setSavingBaseName(
          true,
        );

        setBaseNameError(
          null,
        );

        try {
          const response =
            await fetch(
              "/api/world-preferences",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    baseNames: {
                      [String(
                        baseIndex,
                      )]:
                        cleanedName,
                    },
                  }),
              },
            );

          const preferences =
            (await response.json()) as WorldPreferences;

          if (!response.ok) {
            throw new Error(
              preferences.error ??
                `Saving base name failed with ${response.status}`,
            );
          }

          setBaseNames({
            ...DEFAULT_BASE_NAMES,
            ...preferences.baseNames,
          });

          setEditingBase(
            null,
          );

          setBaseNameDraft(
            "",
          );

          setBaseNameError(
            null,
          );
        } catch (
          saveError
        ) {
          setBaseNameError(
            saveError instanceof Error
              ? saveError.message
              : String(
                  saveError,
                ),
          );
        } finally {
          setSavingBaseName(
            false,
          );
        }
      },
      [
        baseNameDraft,
      ],
    );

  useEffect(
    () => {
      void fetchWorldState();
      void fetchWorldPreferences();

      const timer =
        window.setInterval(
          () => {
            void fetchWorldState();
          },
          2000,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      fetchWorldState,
      fetchWorldPreferences,
    ],
  );

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090b0e] text-white">
        <div className="text-center">
          <div className="mx-auto h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />

          <p className="mt-4 text-sm text-neutral-400">
            Loading Rebel world intelligence...
          </p>

          {error && (
            <p className="mt-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090b0e] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <header className="border-b border-white/10 pb-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                Rebel Palworld
              </p>

              <h1 className="mt-3 text-3xl font-semibold">
                World Overview
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                Live intelligence from your current Palworld save.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <LiveStatusPill
                status={
                  state.watcher.status
                }
              />

              <Link
                href="/worlds"
                className="rounded-xl border border-white/10 px-4 py-2.5 text-center text-xs text-neutral-400 transition hover:bg-white/5 hover:text-white"
              >
                Worlds
              </Link>

              <Link
                href="/dashboard"
                className="rounded-xl border border-white/10 px-4 py-2.5 text-center text-xs text-neutral-400 transition hover:bg-white/5 hover:text-white"
              >
                Servers
              </Link>

              <a
                href="/pals"
                className="rounded-xl bg-white px-4 py-2.5 text-center text-xs font-medium text-black transition hover:bg-neutral-200"
              >
                ← Pals
              </a>
            </div>
          </div>
        </header>

        <section className="mt-8">
          <SyncStatusPanel
            state={state}
          />
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Owned Pals"
            value={
              state.collection.ownedPals
            }
            description="Detected in current save"
          />

          <MetricCard
            label="Species"
            value={
              state.collection.species
            }
            description="Unique species owned"
          />

          <MetricCard
            label="Safe Cleanup"
            value={
              state.collection.safeCleanup
            }
            description="Lowest-risk redundant copies"
          />

          <MetricCard
            label="Borderline"
            value={
              state.collection.borderlineCleanup
            }
            description="Review before removing"
          />
        </section>

        <section className="mt-10">
          <SectionHeading
            eyebrow="Live Locations"
            title="Where your Pals are right now"
            description="Party, Palbox and base-worker containers are resolved directly from Level.sav."
          />

          {baseNameError && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-xs text-red-300">
              Base preferences: {baseNameError}
            </div>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
            <LocationCard
              title="Party"
              count={
                state.locations.partyCount
              }
              capacity={
                state.locations.partyCapacity
              }
              description="Current active team"
            />

            <LocationCard
              title="Palbox"
              count={
                state.locations.palboxCount
              }
              capacity={
                state.locations.palboxCapacity
              }
              description="Main Pal storage"
            />

            {state.locations.bases.map(
              (base) => {
                const baseName =
                  baseNames[
                    String(
                      base.baseIndex,
                    )
                  ] ??
                  `Base ${base.baseIndex}`;

                return (
                  <LocationCard
                    key={
                      base.baseIndex
                    }
                    title={
                      baseName
                    }
                    count={
                      base.count
                    }
                    capacity={
                      base.capacity
                    }
                    description={
                      base.count === 0
                        ? `Base ${base.baseIndex} · No workers assigned`
                        : `Base ${base.baseIndex} · Workers assigned`
                    }
                    emphasized={
                      base.count === 0
                    }
                    editable
                    href={`/world/base/${base.baseIndex}`}
                    editing={
                      editingBase ===
                      base.baseIndex
                    }
                    draft={
                      baseNameDraft
                    }
                    saving={
                      savingBaseName
                    }
                    onDraftChange={
                      setBaseNameDraft
                    }
                    onEdit={() =>
                      startEditingBase(
                        base.baseIndex,
                      )
                    }
                    onCancel={
                      cancelEditingBase
                    }
                    onSave={() =>
                      void saveBaseName(
                        base.baseIndex,
                      )
                    }
                  />
                );
              },
            )}
          </div>
        </section>

        <section className="mt-10 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-[#12161b]">
            <div className="border-b border-white/10 p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                Party
              </p>

              <h2 className="mt-2 text-lg font-semibold">
                Current team
              </h2>
            </div>

            {state.party.length === 0 ? (
              <div className="p-6 text-sm text-neutral-500">
                No Party Pals detected.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {state.party.map(
                  (pal) => (
                    <PalRow
                      key={
                        pal.id ??
                        `${pal.species}-${pal.slot}`
                      }
                      pal={pal}
                    />
                  ),
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#12161b] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              Collection Health
            </p>

            <h2 className="mt-2 text-lg font-semibold">
              Rebel recommendations
            </h2>

            <div className="mt-5 space-y-3">
              <HealthRow
                label="Core Keep"
                value={
                  state.collection.coreKeep
                }
              />

              <HealthRow
                label="Useful Backup"
                value={
                  state.collection.usefulBackup
                }
              />

              <HealthRow
                label="Borderline Cleanup"
                value={
                  state.collection.borderlineCleanup
                }
              />

              <HealthRow
                label="Safe Cleanup"
                value={
                  state.collection.safeCleanup
                }
              />
            </div>

            <a
              href="/pals"
              className="mt-6 block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-xs text-neutral-300 transition hover:bg-white/[0.06]"
            >
              Open full Pal analysis →
            </a>
          </div>
        </section>

        {state.collection.unknown > 0 && (
          <section className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5">
            <p className="text-xs font-medium text-amber-200">
              {state.collection.unknown} Pal
              {state.collection.unknown === 1
                ? ""
                : "s"}{" "}
              currently have an unresolved container.
            </p>
          </section>
        )}

        {error && (
          <section className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-xs text-red-300">
            Live refresh warning: {error}
          </section>
        )}
      </div>
    </main>
  );
}

function SyncStatusPanel({
  state,
}: {
  state: WorldState;
}) {
  const watcher =
    state.watcher;

  const presentation =
    getStatusPresentation(
      watcher.status,
    );

  const duration =
    watcher.durationMs !== null
      ? watcher.durationMs >= 1000
        ? `${(
            watcher.durationMs / 1000
          ).toFixed(1)}s`
        : `${watcher.durationMs}ms`
      : "—";

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${presentation.panelClass}`}
    >
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span
            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${presentation.dotClass}`}
          />

          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.2em] ${presentation.textClass}`}
            >
              {presentation.label}
            </p>

            <h2 className="mt-2 text-lg font-semibold">
              Rebel Live Sync
            </h2>

            <p className="mt-1 max-w-xl text-xs leading-relaxed text-neutral-500">
              {presentation.description}
            </p>

            {watcher.error && (
              <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300">
                {watcher.error}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          <SyncMetric
            label="Last Sync"
            value={
              formatTime(
                watcher.lastSyncAt,
              )
            }
          />

          <SyncMetric
            label="Sync Time"
            value={duration}
          />

          <SyncMetric
            label="Pals Loaded"
            value={String(
              watcher.palCount ??
                state.collection.ownedPals,
            )}
          />

          <SyncMetric
            label="Save Size"
            value={
              watcher.saveSize !== null
                ? formatBytes(
                    watcher.saveSize,
                  )
                : "—"
            }
          />
        </div>
      </div>

      <div className="border-t border-white/[0.06] bg-black/20 px-5 py-3">
        <div className="flex flex-col gap-1 text-[9px] text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Save modified:{" "}
            {formatTime(
              watcher.saveModifiedAt,
            )}
          </span>

          <span>
            Browser refreshed:{" "}
            {formatTime(
              state.generatedAt,
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function SyncMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.18em] text-neutral-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-neutral-200">
        {value}
      </p>
    </div>
  );
}

function LiveStatusPill({
  status,
}: {
  status: RuntimeStatus;
}) {
  const presentation =
    getStatusPresentation(
      status,
    );

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 ${presentation.pillClass}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${presentation.dotClass}`}
      />

      <span
        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${presentation.textClass}`}
      >
        {presentation.label}
      </span>
    </div>
  );
}

function getStatusPresentation(
  status: RuntimeStatus,
) {
  if (status === "live") {
    return {
      label: "Live",
      description:
        "The watcher is running and the latest Palworld save was processed successfully.",
      dotClass:
        "bg-emerald-400",
      textClass:
        "text-emerald-300",
      panelClass:
        "border-emerald-500/20 bg-emerald-500/[0.035]",
      pillClass:
        "border-emerald-500/20 bg-emerald-500/[0.07]",
    };
  }

  if (status === "syncing") {
    return {
      label: "Syncing",
      description:
        "Palworld saved. Rebel is rebuilding your world intelligence now.",
      dotClass:
        "animate-pulse bg-sky-400",
      textClass:
        "text-sky-300",
      panelClass:
        "border-sky-500/20 bg-sky-500/[0.035]",
      pillClass:
        "border-sky-500/20 bg-sky-500/[0.07]",
    };
  }

  if (status === "starting") {
    return {
      label: "Starting",
      description:
        "The watcher is starting and preparing the initial save import.",
      dotClass:
        "animate-pulse bg-amber-400",
      textClass:
        "text-amber-300",
      panelClass:
        "border-amber-500/20 bg-amber-500/[0.035]",
      pillClass:
        "border-amber-500/20 bg-amber-500/[0.07]",
    };
  }

  if (status === "error") {
    return {
      label: "Error",
      description:
        "The latest save sync failed. Rebel is keeping the previous successful data available.",
      dotClass:
        "bg-red-400",
      textClass:
        "text-red-300",
      panelClass:
        "border-red-500/20 bg-red-500/[0.035]",
      pillClass:
        "border-red-500/20 bg-red-500/[0.07]",
    };
  }

  if (status === "offline") {
    return {
      label: "Offline",
      description:
        "Rebel has not received a watcher heartbeat. Start or restart pnpm rebel.",
      dotClass:
        "bg-red-400",
      textClass:
        "text-red-300",
      panelClass:
        "border-red-500/20 bg-red-500/[0.035]",
      pillClass:
        "border-red-500/20 bg-red-500/[0.07]",
    };
  }

  return {
    label: "Stopped",
    description:
      "The save watcher has been stopped. Run pnpm rebel to resume live synchronization.",
    dotClass:
      "bg-neutral-500",
    textClass:
      "text-neutral-400",
    panelClass:
      "border-white/10 bg-[#12161b]",
    pillClass:
      "border-white/10 bg-white/[0.03]",
  };
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#12161b] p-5">
      <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-2 text-xs text-neutral-600">
        {description}
      </p>
    </div>
  );
}

function LocationCard({
  title,
  count,
  capacity,
  description,
  emphasized = false,
  editable = false,
  href,
  editing = false,
  draft = "",
  saving = false,
  onDraftChange,
  onEdit,
  onCancel,
  onSave,
}: {
  title: string;
  count: number;
  capacity: number;
  description: string;
  emphasized?: boolean;
  editable?: boolean;
  href?: string;
  editing?: boolean;
  draft?: string;
  saving?: boolean;
  onDraftChange?: (
    value: string,
  ) => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}) {
  const percentage =
    capacity > 0
      ? Math.min(
          100,
          Math.round(
            (count / capacity) * 100,
          ),
        )
      : 0;

  return (
    <div
      className={`rounded-2xl border p-5 ${
        emphasized
          ? "border-amber-500/20 bg-amber-500/[0.04]"
          : "border-white/10 bg-[#12161b]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              type="text"
              value={draft}
              maxLength={40}
              disabled={saving}
              onChange={(
                event,
              ) => {
                onDraftChange?.(
                  event.target.value,
                );
              }}
              onKeyDown={(
                event,
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  event.preventDefault();

                  onSave?.();
                }

                if (
                  event.key ===
                  "Escape"
                ) {
                  event.preventDefault();

                  onCancel?.();
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold text-white outline-none transition placeholder:text-neutral-700 focus:border-white/25"
              placeholder="Base name"
            />
          ) : href ? (
            <Link
              href={href}
              className="group inline-flex max-w-full items-center gap-2"
            >
              <span className="truncate text-sm font-semibold transition group-hover:text-white">
                {title}
              </span>

              <span className="text-[10px] text-neutral-700 transition group-hover:translate-x-0.5 group-hover:text-neutral-400">
                →
              </span>
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold">
              {title}
            </p>
          )}

          <p className="mt-1 text-[10px] text-neutral-500">
            {description}
          </p>
        </div>

        <span className="shrink-0 text-xs text-neutral-500">
          {count}/{capacity}
        </span>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-white/40 transition-all"
          style={{
            width:
              `${percentage}%`,
          }}
        />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold">
          {count}
        </p>

        <div className="flex items-center gap-2">
          {href &&
            !editing && (
              <Link
                href={href}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px] text-neutral-400 transition hover:bg-white/5 hover:text-white"
              >
                Inspect
              </Link>
            )}

          {editable && (
            <div>
              {editing ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={
                      onCancel
                    }
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px] text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving ||
                      draft.trim().length ===
                        0
                    }
                    onClick={
                      onSave
                    }
                    className="rounded-lg bg-white px-2.5 py-1.5 text-[9px] font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving
                      ? "Saving..."
                      : "Save"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={
                    onEdit
                  }
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px] text-neutral-500 transition hover:bg-white/5 hover:text-neutral-300"
                >
                  Rename
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PalRow({
  pal,
}: {
  pal:
    WorldState["party"][number];
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-sm font-medium">
          {pal.nickname ??
            pal.species}
        </p>

        <p className="mt-1 text-[10px] text-neutral-500">
          {pal.nickname
            ? `${pal.species} · `
            : ""}

          {pal.level !== null
            ? `Lv. ${pal.level}`
            : "Level unknown"}

          {pal.gender
            ? ` · ${pal.gender}`
            : ""}
        </p>
      </div>

      <div className="text-right">
        <p className="text-xs text-neutral-300">
          Slot {pal.slot ?? "—"}
        </p>

        <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-neutral-600">
          Party
        </p>
      </div>
    </div>
  );
}

function HealthRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3">
      <span className="text-xs text-neutral-400">
        {label}
      </span>

      <span className="text-sm font-semibold">
        {value}
      </span>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-xl font-semibold">
        {title}
      </h2>

      <p className="mt-1 text-sm text-neutral-500">
        {description}
      </p>
    </div>
  );
}

function formatTime(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      timeZone:
        "Africa/Johannesburg",

      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",

      hour12:
        false,
    },
  ).format(date);
}

function formatBytes(
  bytes: number,
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}