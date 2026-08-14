import fs from "node:fs";
import path from "node:path";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import ownedPalsData from "@/lib/palworld/owned-pals.generated.json";

import type {
  BaseStrategy,
  BaseWorkPriority,
  CapacityState,
  OwnedPal,
  PalPassive,
  RecommendationStatus,
  SelectedWorld,
  WorkCoverage,
  WorkProfile,
  WorkRecommendation,
  WorldPreferencesFile,
} from "@/lib/palworld/optimizer/types";

import {
  buildBaseStrategy,
} from "@/lib/palworld/optimizer/base-strategy";

import {
  buildCapacityReason,
  calculateCapacityState,
  countUniqueAddCandidates,
  getCapacityStatusLabel,
} from "@/lib/palworld/optimizer/capacity";

import {
  buildRecommendations,
} from "@/lib/palworld/optimizer/recommendations";

import type {
  BaseCompositionPlan,
  CompositionMove,
  CompositionStatus,
  CompositionWorkTarget,
} from "@/lib/palworld/optimizer/composition";

import {
  buildBaseCompositionPlan,
} from "@/lib/palworld/optimizer/composition";

import {
  calculateWorkProfile,
  isWorkDisabled,
} from "@/lib/palworld/optimizer/worker-score";

type PageProps = {
  params: Promise<{
    baseIndex: string;
  }>;
};

const pals =
  ownedPalsData as unknown as OwnedPal[];

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export default async function BaseInspectorPage({
  params,
}: PageProps) {
  const resolvedParams =
    await params;

  const baseIndex =
    Number(
      resolvedParams.baseIndex,
    );

  if (
    !Number.isInteger(
      baseIndex,
    ) ||
    baseIndex < 1
  ) {
    notFound();
  }

  const selectedWorld =
    readSelectedWorld();

  const preferences =
    readWorldPreferences();

  const worldId =
    selectedWorld?.worldId ??
    null;

  const baseNames =
    worldId
      ? preferences.worlds?.[
          worldId
        ]?.baseNames
      : undefined;

  const baseName =
    baseNames?.[
      String(
        baseIndex,
      )
    ] ??
    `Base ${baseIndex}`;

  const workers =
    pals
      .filter(
        (pal) =>
          pal.location?.type ===
            "BASE" &&
          pal.location
            ?.baseIndex ===
            baseIndex,
      )
      .sort(
        (
          a,
          b,
        ) =>
          (
            a.location
              ?.displaySlot ??
            Number.MAX_SAFE_INTEGER
          ) -
          (
            b.location
              ?.displaySlot ??
            Number.MAX_SAFE_INTEGER
          ),
      );

  const palboxPals =
    pals.filter(
      (pal) =>
        pal.location?.type ===
        "PALBOX",
    );

  const baseLocation =
    workers.find(
      (pal) =>
        pal.location
          ?.coordinates,
    )?.location ??
    null;

  const capacity =
    workers.find(
      (pal) =>
        typeof pal.location
          ?.capacity ===
        "number",
    )?.location
      ?.capacity ??
    26;

  const workCoverage =
    buildWorkCoverage(
      workers,
    );

  const baseStrategy =
    buildBaseStrategy(
      baseName,
      workCoverage,
      workers,
    );

  const capacityState =
    calculateCapacityState(
      workers,
      capacity,
    );

  const averageLevel =
    workers.length > 0
      ? Math.round(
          workers.reduce(
            (
              total,
              pal,
            ) =>
              total +
              (
                pal.level ??
                0
              ),
            0,
          ) /
            workers.length,
        )
      : 0;

  const recommendations =
    buildRecommendations(
      workCoverage,
      palboxPals,
      baseStrategy,
      capacityState,
    );

  const compositionPlan =
    buildBaseCompositionPlan(
      workers,
      workCoverage,
      recommendations,
      baseStrategy,
      capacityState,
    );

  const uniqueAddCandidates =
    countUniqueAddCandidates(
      recommendations,
    );

  const immediateUpgrades =
    recommendations.filter(
      (item) =>
        item.status ===
        "upgrade",
    );

  const developmentUpgrades =
    recommendations.filter(
      (item) =>
        item.status ===
        "develop",
    );

  const alternatives =
    recommendations.filter(
      (item) =>
        item.status ===
        "alternative",
    );

  const optimal =
    recommendations.filter(
      (item) =>
        item.status ===
        "optimal",
    );

  return (
    <main className="min-h-screen bg-[#090b0e] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <header className="border-b border-white/10 pb-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                Rebel Palworld
              </p>

              <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                Base Inspector - Base{" "}
                {baseIndex}
              </p>

              <h1 className="mt-2 text-3xl font-semibold">
                {baseName}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-400">
                Work-aware optimisation from
                your current Palworld save.
                Rebel now reasons about both
                worker quality and the likely
                purpose of this base.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/world"
                className="rounded-xl border border-white/10 px-4 py-2.5 text-xs text-neutral-300 transition hover:bg-white/5 hover:text-white"
              >
                World Overview
              </Link>

              <Link
                href="/pals"
                className="rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
              >
                Pal Intelligence
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Workers"
            value={`${workers.length}/${capacity}`}
            description="Currently assigned"
          />

          <MetricCard
            label="Palbox"
            value={String(
              palboxPals.length,
            )}
            description="Available for comparison"
          />

          <MetricCard
            label="Average Level"
            value={
              workers.length > 0
                ? String(
                    averageLevel,
                  )
                : "-"
            }
            description="Across assigned workers"
          />

          <MetricCard
            label="Work Types"
            value={String(
              workCoverage.length,
            )}
            description="Active base capabilities"
          />

          <MetricCard
            label="Free Slots"
            value={String(
              capacityState.freeSlots,
            )}
            description={
              capacityState.freeSlots >
              0
                ? "Available before replacement is needed"
                : "Base is at worker capacity"
            }
            emphasized={
              capacityState.freeSlots >
              0
            }
          />
        </section>

        {baseLocation
          ?.coordinates && (
          <section className="mt-5 rounded-2xl border border-white/[0.07] bg-black/20 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-500">
                  Base Location
                </p>

                <p className="mt-2 text-xs text-neutral-400">
                  Rebel resolved this base
                  directly from Level.sav.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6 font-mono text-[10px] text-neutral-400">
                <Coordinate
                  label="X"
                  value={
                    baseLocation
                      .coordinates.x
                  }
                />

                <Coordinate
                  label="Y"
                  value={
                    baseLocation
                      .coordinates.y
                  }
                />

                <Coordinate
                  label="Z"
                  value={
                    baseLocation
                      .coordinates.z
                  }
                />
              </div>
            </div>
          </section>
        )}

        <section className="mt-8">
          <BaseStrategyCard
            strategy={
              baseStrategy
            }
          />
        </section>

        <section className="mt-5">
          <CapacityIntelligenceCard
            capacityState={
              capacityState
            }
            uniqueAddCandidates={
              uniqueAddCandidates
            }
          />
        </section>

        <section className="mt-5">
          <BaseCompositionIntelligenceCard
            plan={
              compositionPlan
            }
          />
        </section>

        <section className="mt-10">
          <SectionHeading
            eyebrow="Rebel Intelligence"
            title="Worker optimisation"
            description="Recommendations are now weighted by both worker quality and how important that work type appears to be for this base."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <OptimisationSummaryCard
              label="Add to Base"
              value={
                uniqueAddCandidates
              }
              description="Useful Palbox candidates that can be added without removing a current worker."
              tone="add"
            />

            <OptimisationSummaryCard
              label="Replace Now"
              value={
                immediateUpgrades.length
              }
              description="Swap-ready recommendations when capacity requires a replacement."
              tone="upgrade"
            />

            <OptimisationSummaryCard
              label="Develop First"
              value={
                developmentUpgrades.length
              }
              description="High-potential replacements that are far behind in development."
              tone="develop"
            />

            <OptimisationSummaryCard
              label="Strong Alternatives"
              value={
                alternatives.length
              }
              description="Comparable suitability with stronger work-specific traits."
              tone="alternative"
            />

            <OptimisationSummaryCard
              label="Already Strong"
              value={
                optimal.length
              }
              description="No Palbox candidate clearly improves this role."
              tone="optimal"
            />
          </div>
        </section>

        <section className="mt-10">
          <SectionHeading
            eyebrow="Replacement Engine"
            title="Best Palbox candidates"
            description="Recommendations are analysis-only. Rebel never moves, removes or modifies Pals in your save."
          />

          {recommendations.length ===
          0 ? (
            <EmptyPanel>
              This base currently has no
              active work suitability data to
              optimise.
            </EmptyPanel>
          ) : (
            <div className="mt-5 space-y-4">
              {recommendations.map(
                (
                  recommendation,
                ) => (
                  <RecommendationCard
                    key={
                      recommendation.work
                    }
                    recommendation={
                      recommendation
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-sky-500/15 bg-sky-500/[0.035] p-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-sky-300">
            How Rebel Ranks Workers
          </p>

          <h2 className="mt-2 text-lg font-semibold">
            Work-aware and base-aware
          </h2>

          <p className="mt-2 max-w-4xl text-xs leading-relaxed text-neutral-400">
            Rebel evaluates work suitability,
            work-speed traits, SAN
            sustainability, nocturnal uptime,
            direct suitability bonuses and
            Transporting movement effects.
            It then weights recommendations by
            how relevant each job appears to
            this specific base. Capacity is
            checked before any replacement is
            recommended: if a worker slot is
            free, Rebel prefers adding a useful
            Pal instead of removing a good one.
          </p>

          <p className="mt-3 max-w-4xl text-[10px] leading-relaxed text-neutral-500">
            Base-role detection is heuristic.
            Rebel uses the base name, active
            workers and work coverage as
            evidence. If evidence is weak, the
            base remains classified as General
            Production rather than forcing a
            specialised role.
          </p>
        </section>

        <section className="mt-10">
          <SectionHeading
            eyebrow="Base Capability"
            title="Work coverage"
            description="Only work types that are currently enabled on assigned Pals count toward active coverage."
          />

          {workCoverage.length ===
          0 ? (
            <EmptyPanel>
              No active work capabilities are
              currently represented at this
              base.
            </EmptyPanel>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {workCoverage.map(
                (
                  work,
                ) => (
                  <WorkCoverageCard
                    key={
                      work.name
                    }
                    work={
                      work
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>

        <section className="mt-10">
          <SectionHeading
            eyebrow="Assigned Pals"
            title="Current workers"
            description="Every Pal Rebel currently resolves to this base container."
          />

          {workers.length ===
          0 ? (
            <EmptyPanel>
              No Pals are currently assigned
              to {baseName}.
            </EmptyPanel>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {workers.map(
                (
                  pal,
                ) => (
                  <WorkerCard
                    key={
                      pal.id ??
                      `${pal.internalSpeciesId}-${pal.location?.displaySlot}`
                    }
                    pal={
                      pal
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function BaseCompositionIntelligenceCard({
  plan,
}: {
  plan: BaseCompositionPlan;
}) {
  const understaffed =
    plan.workTargets.filter(
      (target) =>
        target.status ===
        "understaffed",
    );

  const balanced =
    plan.workTargets.filter(
      (target) =>
        target.status ===
        "balanced",
    );

  const overstaffed =
    plan.workTargets.filter(
      (target) =>
        target.status ===
          "overstaffed" ||
        target.status ===
          "low-priority",
    );

  const actionableMoves =
    plan.moves.filter(
      (move) =>
        move.type !==
        "hold",
    );

  return (
    <section className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.025] p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Base Composition Intelligence
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            What should this base do next?
          </h2>

          <p className="mt-2 max-w-4xl text-xs leading-relaxed text-neutral-400">
            {plan.summary}
          </p>
        </div>

        <div className="grid min-w-fit grid-cols-2 gap-2 sm:grid-cols-4">
          <CompositionMetric
            label="Understaffed"
            value={String(
              understaffed.length,
            )}
            tone="warning"
          />

          <CompositionMetric
            label="Balanced"
            value={String(
              balanced.length,
            )}
            tone="good"
          />

          <CompositionMetric
            label="Heavy / Low"
            value={String(
              overstaffed.length,
            )}
            tone="muted"
          />

          <CompositionMetric
            label="Next Moves"
            value={String(
              actionableMoves.length,
            )}
            tone="info"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-400">
                Coverage Plan
              </p>

              <p className="mt-1 text-[10px] text-neutral-500">
                Current active coverage compared with Rebel&apos;s target for this base role.
              </p>
            </div>

            <span className="text-[9px] text-neutral-500">
              {plan.workTargets.length} work types
            </span>
          </div>

          {plan.workTargets.length ===
          0 ? (
            <p className="mt-4 text-xs text-neutral-500">
              No work coverage is available to analyse yet.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {plan.workTargets.map(
                (target) => (
                  <CompositionTargetRow
                    key={target.work}
                    target={target}
                  />
                ),
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-400">
                Next Best Moves
              </p>

              <p className="mt-1 text-[10px] text-neutral-500">
                One Pal is only counted once, even when it can solve several jobs.
              </p>
            </div>

            <span className="text-[9px] text-neutral-500">
              Top {Math.min(
                6,
                plan.moves.length,
              )}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {plan.moves
              .slice(
                0,
                6,
              )
              .map(
                (
                  move,
                  index,
                ) => (
                  <CompositionMoveRow
                    key={`${move.type}-${move.work}-${move.pal?.id ?? move.pal?.internalSpeciesId ?? index}`}
                    move={move}
                    index={index}
                  />
                ),
              )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CompositionMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "warning"
    | "good"
    | "muted"
    | "info";
}) {
  const classes =
    tone ===
    "warning"
      ? "border-amber-500/15 bg-amber-500/[0.04] text-amber-200"
      : tone ===
          "good"
        ? "border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-200"
        : tone ===
            "info"
          ? "border-sky-500/15 bg-sky-500/[0.04] text-sky-200"
          : "border-white/[0.07] bg-black/20 text-neutral-300";

  return (
    <div
      className={`min-w-[96px] rounded-xl border px-3 py-3 ${classes}`}
    >
      <p className="text-[8px] uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function CompositionTargetRow({
  target,
}: {
  target: CompositionWorkTarget;
}) {
  const presentation =
    getCompositionStatusPresentation(
      target.status,
    );

  return (
    <div className="rounded-lg border border-white/[0.05] bg-black/20 px-3 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium text-neutral-200">
              {target.work}
            </p>

            <span
              className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] ${presentation.badgeClass}`}
            >
              {presentation.label}
            </span>
          </div>

          <p className="mt-1 text-[9px] leading-relaxed text-neutral-500">
            {target.reason}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-[9px]">
          <div className="text-right">
            <p className="text-neutral-500">
              Current
            </p>
            <p className="mt-0.5 font-semibold text-neutral-200">
              {target.currentWorkers}
            </p>
          </div>

          <span className="text-neutral-600">
            -&gt;
          </span>

          <div className="text-right">
            <p className="text-neutral-500">
              Target
            </p>
            <p className="mt-0.5 font-semibold text-white">
              {target.recommendedWorkers}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompositionMoveRow({
  move,
  index,
}: {
  move: CompositionMove;
  index: number;
}) {
  const presentation =
    getCompositionMovePresentation(
      move.type,
    );

  return (
    <div
      className={`rounded-lg border px-3 py-3 ${presentation.cardClass}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[9px] font-semibold text-neutral-300">
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] ${presentation.badgeClass}`}
            >
              {presentation.label}
            </span>

            <span className="text-[9px] text-neutral-500">
              {move.work}
            </span>
          </div>

          <p className="mt-2 text-xs font-medium text-neutral-200">
            {move.pal
              ? getPalName(
                  move.pal,
                )
              : "Keep current setup"}
          </p>

          <p className="mt-1 text-[9px] leading-relaxed text-neutral-500">
            {move.reason}
          </p>

          {move.currentWorker &&
            move.type ===
              "replace" && (
              <p className="mt-2 text-[8px] text-neutral-500">
                Replace: {getPalName(
                  move.currentWorker,
                )}
              </p>
            )}
        </div>
      </div>
    </div>
  );
}

function getCompositionStatusPresentation(
  status: CompositionStatus,
) {
  switch (status) {
    case "understaffed":
      return {
        label:
          "Understaffed",
        badgeClass:
          "border-amber-500/20 bg-amber-500/[0.06] text-amber-300",
      };

    case "overstaffed":
      return {
        label:
          "Heavy",
        badgeClass:
          "border-fuchsia-500/20 bg-fuchsia-500/[0.06] text-fuchsia-300",
      };

    case "low-priority":
      return {
        label:
          "Low Priority",
        badgeClass:
          "border-white/10 bg-white/[0.03] text-neutral-400",
      };

    default:
      return {
        label:
          "Balanced",
        badgeClass:
          "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300",
      };
  }
}

function getCompositionMovePresentation(
  type: CompositionMove["type"],
) {
  switch (type) {
    case "add":
      return {
        label:
          "Add",
        cardClass:
          "border-emerald-500/12 bg-emerald-500/[0.025]",
        badgeClass:
          "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300",
      };

    case "develop":
      return {
        label:
          "Develop",
        cardClass:
          "border-amber-500/12 bg-amber-500/[0.025]",
        badgeClass:
          "border-amber-500/20 bg-amber-500/[0.06] text-amber-300",
      };

    case "replace":
      return {
        label:
          "Replace",
        cardClass:
          "border-red-500/12 bg-red-500/[0.025]",
        badgeClass:
          "border-red-500/20 bg-red-500/[0.06] text-red-300",
      };

    default:
      return {
        label:
          "Hold",
        cardClass:
          "border-white/[0.07] bg-black/20",
        badgeClass:
          "border-white/10 bg-white/[0.03] text-neutral-300",
      };
  }
}

function CapacityIntelligenceCard({
  capacityState,
  uniqueAddCandidates,
}: {
  capacityState: CapacityState;
  uniqueAddCandidates: number;
}) {
  const stateLabel =
    getCapacityStatusLabel(
      capacityState,
    );

  const stateClass =
    capacityState.freeSlots ===
    0
      ? "border-red-500/20 bg-red-500/[0.04] text-red-300"
      : capacityState.freeSlots <=
          2
        ? "border-amber-500/20 bg-amber-500/[0.04] text-amber-300"
        : "border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-300";

  return (
    <section className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.025] p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
            Capacity Intelligence
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            {capacityState.assigned}/{capacityState.capacity} worker slots used
          </h2>

          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-neutral-400">
            {buildCapacityReason(
              capacityState,
            )}
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${stateClass}`}
        >
          {stateLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SmallMetric
          label="Free Slots"
          value={String(
            capacityState.freeSlots,
          )}
        />

        <SmallMetric
          label="Utilisation"
          value={`${capacityState.utilisationPercent}%`}
        />

        <SmallMetric
          label="Unique Adds Found"
          value={String(
            uniqueAddCandidates,
          )}
        />
      </div>
    </section>
  );
}

function BaseStrategyCard({
  strategy,
}: {
  strategy: BaseStrategy;
}) {
  return (
    <section className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.035] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-300">
            Rebel Base Intelligence
          </p>

          <h2 className="mt-2 text-xl font-semibold">
            {strategy.label}
          </h2>

          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-neutral-400">
            {
              strategy.reason
            }
          </p>
        </div>

        <div className="rounded-xl border border-violet-500/15 bg-black/20 px-4 py-3">
          <p className="text-[8px] uppercase tracking-[0.16em] text-neutral-500">
            Confidence
          </p>

          <p className="mt-1 text-sm font-semibold capitalize text-violet-200">
            {strategy.confidence}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <StrategyWorkGroup
          label="Priority Work"
          work={
            strategy.priorityWork
          }
          tone="priority"
        />

        <StrategyWorkGroup
          label="Supporting Work"
          work={
            strategy.supportingWork
          }
          tone="support"
        />

        <StrategyWorkGroup
          label="Lower Priority"
          work={
            strategy.lowPriorityWork
          }
          tone="low"
        />
      </div>
    </section>
  );
}

function StrategyWorkGroup({
  label,
  work,
  tone,
}: {
  label: string;
  work: BaseWorkPriority[];
  tone:
    | "priority"
    | "support"
    | "low";
}) {
  const classes =
    tone ===
    "priority"
      ? "border-emerald-500/15 bg-emerald-500/[0.035]"
      : tone ===
          "support"
        ? "border-sky-500/15 bg-sky-500/[0.035]"
        : "border-white/[0.07] bg-black/20";

  return (
    <div
      className={`rounded-xl border p-4 ${classes}`}
    >
      <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </p>

      {work.length ===
      0 ? (
        <p className="mt-3 text-[10px] text-neutral-500">
          None detected.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {work.map(
            (
              item,
            ) => (
              <div
                key={
                  item.work
                }
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2"
              >
                <span className="text-xs text-neutral-200">
                  {
                    item.work
                  }
                </span>

                <span className="text-[9px] text-neutral-500">
                  {item.workers} workers
                  {" · "}
                  best Lv.
                  {item.highestLevel}
                </span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// RECOMMENDATION UI
// ============================================================

function RecommendationCard({
  recommendation,
}: {
  recommendation: WorkRecommendation;
}) {
  const presentation =
    getRecommendationPresentation(
      recommendation.status,
    );

  return (
    <article
      className={`rounded-2xl border p-5 ${presentation.cardClass}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">
              {
                recommendation.work
              }
            </h3>

            <span
              className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${presentation.badgeClass}`}
            >
              {
                presentation.label
              }
            </span>
          </div>

          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-neutral-300">
            {
              recommendation.reason
            }
          </p>

          {recommendation.notes.length >
            0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {recommendation.notes.map(
                (
                  note,
                ) => (
                  <span
                    key={
                      note
                    }
                    className="rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-1.5 text-[9px] text-neutral-400"
                  >
                    {note}
                  </span>
                ),
              )}
            </div>
          )}
        </div>

        {recommendation.currentProfile &&
          recommendation.candidateProfile && (
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right">
            <p className="text-[8px] uppercase tracking-[0.18em] text-neutral-500">
              Worker Score
            </p>

            <p className="mt-1 text-lg font-semibold">
              {
                recommendation.currentProfile
                  .workerScore
              }

              {" -> "}

              <span
                className={
                  recommendation.improvement >
                  0
                    ? "text-emerald-300"
                    : "text-neutral-300"
                }
              >
                {
                  recommendation.candidateProfile
                    .workerScore
                }
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <ComparisonPal
          label="Current Best"
          pal={
            recommendation.currentBest
          }
          work={
            recommendation.work
          }
          profile={
            recommendation.currentProfile
          }
          locationLabel="Assigned to Base"
        />

        <div className="hidden items-center justify-center text-neutral-600 lg:flex">
          <span className="text-xl">
            -&gt;
          </span>
        </div>

        <ComparisonPal
          label={
            recommendation.status ===
            "develop"
              ? "Development Candidate"
              : recommendation.status ===
                  "add"
                ? "Recommended Addition"
                : "Best Palbox Candidate"
          }
          pal={
            recommendation.candidate
          }
          work={
            recommendation.work
          }
          profile={
            recommendation.candidateProfile
          }
          locationLabel="Currently in Palbox"
          highlighted={
            recommendation.status ===
              "add" ||
            recommendation.status ===
              "upgrade" ||
            recommendation.status ===
              "develop" ||
            recommendation.status ===
              "alternative"
          }
        />
      </div>
    </article>
  );
}

function ComparisonPal({
  label,
  pal,
  work,
  profile,
  locationLabel,
  highlighted = false,
}: {
  label: string;
  pal: OwnedPal | null;
  work: string;
  profile: WorkProfile | null;
  locationLabel: string;
  highlighted?: boolean;
}) {
  if (
    !pal ||
    !profile
  ) {
    return (
      <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
        <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </p>

        <p className="mt-3 text-sm text-neutral-400">
          No Pal found.
        </p>
      </div>
    );
  }

  const relevantPassives =
    profile.relevantPassives.filter(
      (
        effect,
      ) =>
        effect.score !==
          0 ||
        effect.category ===
          "job-rank",
    );

  return (
    <div
      className={`rounded-xl border p-4 ${
        highlighted
          ? "border-sky-500/20 bg-sky-500/[0.04]"
          : "border-white/[0.07] bg-black/20"
      }`}
    >
      <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold">
            {getPalName(
              pal,
            )}
          </p>

          <p className="mt-1 text-xs text-neutral-400">
            {pal.nickname
              ? `${pal.species} - `
              : ""}

            {pal.level !==
            null
              ? `Lv. ${pal.level}`
              : "Level unknown"}

            {pal.gender
              ? ` - ${pal.gender}`
              : ""}
          </p>
        </div>

        {pal.isAlpha && (
          <span className="rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-amber-300">
            Alpha
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SmallMetric
          label={work}
          value={
            profile.jobRankBonus >
            0
              ? `Lv.${profile.baseWorkLevel} +${profile.jobRankBonus}`
              : `Lv.${profile.baseWorkLevel}`
          }
        />

        <SmallMetric
          label="Effective"
          value={`Lv.${profile.effectiveWorkLevel}`}
        />

        <SmallMetric
          label="Work Traits"
          value={
            profile.passiveScore >
              0
              ? `+${profile.passiveScore}`
              : String(
                  profile.passiveScore,
                )
          }
        />

        <SmallMetric
          label="Worker Score"
          value={String(
            profile.workerScore,
          )}
        />
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[9px] text-neutral-400">
            {locationLabel}
          </span>

          <span className="text-[9px] text-neutral-500">
            Enabled roles:{" "}
            {
              profile.roleCount
            }
          </span>
        </div>

        {relevantPassives.length >
          0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {relevantPassives.map(
              (
                effect,
              ) => (
                <span
                  key={`${effect.passive.internalId}-${effect.category}`}
                  className={`rounded-md border px-2 py-1 text-[8px] ${
                    effect.score <
                    0
                      ? "border-red-500/15 bg-red-500/[0.04] text-red-300"
                      : "border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-300"
                  }`}
                  title={
                    effect.summary
                  }
                >
                  {
                    effect.passive.name
                  }

                  {" · "}

                  {
                    effect.summary
                  }
                </span>
              ),
            )}
          </div>
        ) : (
          <p className="mt-3 text-[9px] text-neutral-500">
            No work-specific passive
            advantage detected.
          </p>
        )}
      </div>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5">
      <p className="truncate text-[8px] uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

function getRecommendationPresentation(
  status: RecommendationStatus,
) {
  if (
    status ===
    "add"
  ) {
    return {
      label:
        "Add to Base",

      cardClass:
        "border-cyan-500/20 bg-cyan-500/[0.035]",

      badgeClass:
        "border-cyan-500/25 bg-cyan-500/[0.08] text-cyan-300",
    };
  }

  if (
    status ===
    "upgrade"
  ) {
    return {
      label:
        "Immediate Upgrade",

      cardClass:
        "border-emerald-500/20 bg-emerald-500/[0.035]",

      badgeClass:
        "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300",
    };
  }

  if (
    status ===
    "develop"
  ) {
    return {
      label:
        "Develop First",

      cardClass:
        "border-amber-500/20 bg-amber-500/[0.035]",

      badgeClass:
        "border-amber-500/25 bg-amber-500/[0.08] text-amber-300",
    };
  }

  if (
    status ===
    "alternative"
  ) {
    return {
      label:
        "Strong Alternative",

      cardClass:
        "border-sky-500/20 bg-sky-500/[0.035]",

      badgeClass:
        "border-sky-500/25 bg-sky-500/[0.08] text-sky-300",
    };
  }

  return {
    label:
      "Current Setup Strong",

    cardClass:
      "border-white/10 bg-[#12161b]",

    badgeClass:
      "border-white/10 bg-white/[0.03] text-neutral-300",
  };
}

// ============================================================
// SUMMARY CARDS
// ============================================================

function OptimisationSummaryCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: number;
  description: string;

  tone:
    | "add"
    | "upgrade"
    | "develop"
    | "alternative"
    | "optimal";
}) {
  const classes =
    tone ===
    "add"
      ? "border-cyan-500/20 bg-cyan-500/[0.035]"
      : tone ===
          "upgrade"
        ? "border-emerald-500/20 bg-emerald-500/[0.035]"
        : tone ===
            "develop"
          ? "border-amber-500/20 bg-amber-500/[0.035]"
          : tone ===
              "alternative"
            ? "border-sky-500/20 bg-sky-500/[0.035]"
            : "border-white/10 bg-[#12161b]";

  return (
    <div
      className={`rounded-2xl border p-5 ${classes}`}
    >
      <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-400">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-2 text-xs leading-relaxed text-neutral-400">
        {description}
      </p>
    </div>
  );
}

// ============================================================
// CURRENT WORKER CARD
// ============================================================

function WorkerCard({
  pal,
}: {
  pal: OwnedPal;
}) {
  const workEntries =
    Object.entries(
      pal.workSuitability ??
        {},
    ).sort(
      (
        a,
        b,
      ) =>
        b[1] -
        a[1],
    );

  return (
    <article className="rounded-2xl border border-white/10 bg-[#12161b] p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">
              {getPalName(
                pal,
              )}
            </h3>

            {pal.isAlpha && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-amber-300">
                Alpha
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-neutral-400">
            {pal.nickname
              ? `${pal.species} - `
              : ""}

            {pal.level !==
            null
              ? `Lv. ${pal.level}`
              : "Level unknown"}

            {pal.gender
              ? ` - ${pal.gender}`
              : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {pal.elements.map(
              (
                element,
              ) => (
                <span
                  key={
                    element
                  }
                  className="rounded-lg border border-white/[0.07] bg-black/20 px-2 py-1 text-[9px] text-neutral-300"
                >
                  {
                    element
                  }
                </span>
              ),
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-[8px] uppercase tracking-[0.18em] text-neutral-500">
            Base Slot
          </p>

          <p className="mt-1 text-sm font-semibold text-neutral-200">
            {pal.location
              ?.displaySlot ??
              "-"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <IvMetric
          label="HP IV"
          value={
            pal.ivs.hp
          }
        />

        <IvMetric
          label="ATK IV"
          value={
            pal.ivs.attack
          }
        />

        <IvMetric
          label="DEF IV"
          value={
            pal.ivs.defense
          }
        />
      </div>

      <div className="mt-5">
        <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-500">
          Work Suitability
        </p>

        {workEntries.length ===
        0 ? (
          <p className="mt-3 text-xs text-neutral-500">
            No work suitability data.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {workEntries.map(
              ([
                work,
                level,
              ]) => {
                const disabled =
                  isWorkDisabled(
                    pal,
                    work,
                  );

                return (
                  <span
                    key={
                      work
                    }
                    className={`rounded-lg border px-2.5 py-1.5 text-[9px] ${
                      disabled
                        ? "border-red-500/15 bg-red-500/[0.04] text-red-300"
                        : "border-emerald-500/15 bg-emerald-500/[0.045] text-emerald-300"
                    }`}
                  >
                    {work} Lv.
                    {level}

                    {disabled
                      ? " · Disabled"
                      : ""}
                  </span>
                );
              },
            )}
          </div>
        )}
      </div>

      <div className="mt-5">
        <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-500">
          Passives
        </p>

        {pal.passives.length ===
        0 ? (
          <p className="mt-3 text-xs text-neutral-500">
            No passive skills detected.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {pal.passives.map(
              (
                passive,
              ) => (
                <PassiveRow
                  key={`${pal.id}-${passive.internalId}`}
                  passive={
                    passive
                  }
                />
              ),
            )}
          </div>
        )}
      </div>

      {pal.disabledWorkSuitabilities &&
        pal
          .disabledWorkSuitabilities
          .length >
          0 && (
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <p className="text-[8px] uppercase tracking-[0.18em] text-neutral-500">
              Disabled Work
            </p>

            <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
              {pal.disabledWorkSuitabilities.join(
                " - ",
              )}
            </p>
          </div>
        )}
    </article>
  );
}

// ============================================================
// WORK COVERAGE
// ============================================================

function buildWorkCoverage(
  workers: OwnedPal[],
): WorkCoverage[] {
  const workMap =
    new Map<
      string,
      WorkCoverage
    >();

  for (
    const pal
    of workers
  ) {
    for (
      const [
        work,
        level,
      ]
      of Object.entries(
        pal.workSuitability ??
          {},
      )
    ) {
      if (
        typeof level !==
          "number" ||
        level <=
          0 ||
        isWorkDisabled(
          pal,
          work,
        )
      ) {
        continue;
      }

      const profile =
        calculateWorkProfile(
          pal,
          work,
          1,
        );

      const existing =
        workMap.get(
          work,
        );

      if (!existing) {
        workMap.set(
          work,
          {
            name:
              work,

            workers:
              1,

            highestLevel:
              profile.effectiveWorkLevel,

            totalLevel:
              profile.effectiveWorkLevel,

            bestWorker:
              pal,

            bestProfile:
              profile,
          },
        );

        continue;
      }

      existing.workers +=
        1;

      existing.totalLevel +=
        profile.effectiveWorkLevel;

      const existingProfile =
        existing.bestProfile;

      if (
        !existingProfile ||
        profile.effectiveWorkLevel >
          existingProfile.effectiveWorkLevel ||
        (
          profile.effectiveWorkLevel ===
            existingProfile.effectiveWorkLevel &&
          profile.workerScore >
            existingProfile.workerScore
        )
      ) {
        existing.highestLevel =
          profile.effectiveWorkLevel;

        existing.bestWorker =
          pal;

        existing.bestProfile =
          profile;
      }
    }
  }

  return Array.from(
    workMap.values(),
  ).sort(
    (
      a,
      b,
    ) => {
      if (
        b.highestLevel !==
        a.highestLevel
      ) {
        return (
          b.highestLevel -
          a.highestLevel
        );
      }

      return (
        b.workers -
        a.workers
      );
    },
  );
}

function WorkCoverageCard({
  work,
}: {
  work: WorkCoverage;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#12161b] p-5">
      <p className="text-sm font-semibold">
        {work.name}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.18em] text-neutral-500">
            Workers
          </p>

          <p className="mt-1 text-xl font-semibold">
            {work.workers}
          </p>
        </div>

        <div>
          <p className="text-[8px] uppercase tracking-[0.18em] text-neutral-500">
            Best Effective
          </p>

          <p className="mt-1 text-xl font-semibold">
            Lv.
            {work.highestLevel}
          </p>
        </div>
      </div>

      {work.bestWorker &&
        work.bestProfile && (
        <div className="mt-4 border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] uppercase tracking-[0.16em] text-neutral-500">
                Current Best
              </p>

              <p className="mt-1 truncate text-xs text-neutral-200">
                {getPalName(
                  work.bestWorker,
                )}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[8px] uppercase tracking-[0.16em] text-neutral-500">
                Score
              </p>

              <p className="mt-1 text-xs font-semibold text-neutral-200">
                {
                  work.bestProfile
                    .workerScore
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// GENERIC COMPONENTS
// ============================================================

function MetricCard({
  label,
  value,
  description,
  emphasized = false,
}: {
  label: string;
  value: string;
  description: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        emphasized
          ? "border-emerald-500/20 bg-emerald-500/[0.035]"
          : "border-white/10 bg-[#12161b]"
      }`}
    >
      <p className="text-[9px] uppercase tracking-[0.22em] text-neutral-400">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-2 text-xs text-neutral-400">
        {description}
      </p>
    </div>
  );
}

function IvMetric({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const score =
    value ??
    0;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
      <p className="text-[8px] uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {value ??
          "-"}
      </p>

      {value !==
        null && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-white/40"
            style={{
              width:
                `${Math.min(
                  100,
                  Math.max(
                    0,
                    score,
                  ),
                )}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function PassiveRow({
  passive,
}: {
  passive: PalPassive;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium text-neutral-200">
          {passive.name}
        </p>

        <span
          className={`text-[9px] font-semibold ${
            passive.rank >=
            3
              ? "text-emerald-300"
              : passive.rank <
                  0
                ? "text-red-300"
                : "text-neutral-400"
          }`}
        >
          Rank{" "}
          {passive.rank}
        </span>
      </div>

      {passive.description && (
        <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">
          {
            passive.description
          }
        </p>
      )}
    </div>
  );
}

function Coordinate({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>

      <p className="mt-1">
        {Math.round(
          value,
        ).toLocaleString()}
      </p>
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
      <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-xl font-semibold">
        {title}
      </h2>

      <p className="mt-1 max-w-3xl text-sm text-neutral-400">
        {description}
      </p>
    </div>
  );
}

function EmptyPanel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-[#12161b] p-8 text-sm text-neutral-400">
      {children}
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getPalName(
  pal: OwnedPal,
) {
  return (
    pal.nickname ??
    pal.species
  );
}

// ============================================================
// LOCAL WORLD CONFIG
// ============================================================

function getToolsDirectory() {
  return path.resolve(
    process.cwd(),
    "..",
    "..",
    "tools",
    "pal-save-import",
  );
}

function readSelectedWorld():
  SelectedWorld | null {
  try {
    const filePath =
      path.join(
        getToolsDirectory(),
        "selected-world.json",
      );

    if (
      !fs.existsSync(
        filePath,
      )
    ) {
      return null;
    }

    return JSON.parse(
      fs.readFileSync(
        filePath,
        "utf8",
      ),
    ) as SelectedWorld;
  } catch {
    return null;
  }
}

function readWorldPreferences():
  WorldPreferencesFile {
  try {
    const filePath =
      path.join(
        getToolsDirectory(),
        "world-preferences.json",
      );

    if (
      !fs.existsSync(
        filePath,
      )
    ) {
      return {
        worlds: {},
      };
    }

    return JSON.parse(
      fs.readFileSync(
        filePath,
        "utf8",
      ),
    ) as WorldPreferencesFile;
  } catch {
    return {
      worlds: {},
    };
  }
}