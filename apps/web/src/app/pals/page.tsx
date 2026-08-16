


"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getPassiveTraitIntelligence } from "@/lib/palworld/passive-intelligence";

import {
  rankRealPals,
  type DecisionBucket,
  type RankedRealPal,
  type RealOwnedPal,
  type ReviewCategory,
  type SpeciesGroup,
} from "@/lib/palworld/rank-pals";

type PalSnapshotResponse = {
  source: "local" | "cloud";
  entities: RealOwnedPal[];
  syncedAt: string | null;
  error?: string;
};

type View =
  | "overview"
  | "combat"
  | "base"
  | "farming"
  | "support"
  | "breeding"
  | "humans"
  | "special"
  | "cleanup";

type BaseWinnerGroup = {
  pal: RankedRealPal;
  jobs: {
    job: string;
    level: number | null;
    score: number | null;
  }[];
};

type CleanupFilter =
  | "all"
  | "cleanup"
  | "review"
  | "keepers";

const BASE_JOBS = [
  "Mining",
  "Handiwork",
  "Transporting",
  "Kindling",
  "Watering",
  "Planting",
  "Gathering",
  "Lumbering",
  "Generating Electricity",
  "Cooling",
  "Medicine Production",
  "Farming",
];

export default function PalsPage() {
  const [
    ownedPals,
    setOwnedPals,
  ] =
    useState<
      RealOwnedPal[]
    >([]);

  const [
    snapshotSource,
    setSnapshotSource,
  ] =
    useState<
      "local" |
      "cloud" |
      null
    >(null);

  const [
    snapshotError,
    setSnapshotError,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    snapshotLoading,
    setSnapshotLoading,
  ] =
    useState(true);

  useEffect(
    () => {
      let active =
        true;

      async function loadSnapshot() {
        try {
          const response =
            await fetch(
              "/api/pal-snapshot",
              {
                cache:
                  "no-store",
              },
            );

          const body =
            (await response.json()) as
              PalSnapshotResponse;

          if (
            !response.ok ||
            !Array.isArray(
              body.entities,
            )
          ) {
            throw new Error(
              body.error ??
              "Could not load Pal snapshot",
            );
          }

          if (!active) {
            return;
          }

          setOwnedPals(
            body.entities,
          );

          setSnapshotSource(
            body.source,
          );

          setSnapshotError(
            null,
          );
        } catch (error) {
          if (!active) {
            return;
          }

          setSnapshotError(
            error instanceof Error
              ? error.message
              : String(error),
          );
        } finally {
          if (active) {
            setSnapshotLoading(
              false,
            );
          }
        }
      }

      void loadSnapshot();

      return () => {
        active =
          false;
      };
    },
    [],
  );

  const rankings = useMemo(
    () =>
      rankRealPals(
        ownedPals,
      ),
    [
      ownedPals,
    ],
  );

  const [view, setView] =
    useState<View>("overview");

  const [
    selectedPal,
    setSelectedPal,
  ] =
    useState<RankedRealPal | null>(
      null,
    );

  const [searchQuery, setSearchQuery] =
    useState("");

  return (
    <main className="min-h-screen bg-[#0c0f13] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1700px]">
        <Sidebar
          view={view}
          setView={setView}
          total={
            rankings.summary.total
          }
          species={
            rankings.summary.species
          }
        />

        <div className="min-w-0 flex-1">
          <TopBar
            view={view}
            keep={
              rankings.summary.keep
            }
            review={
              rankings.summary.review
            }
            cleanup={
              rankings.summary
                .safeToReplace
            }
          />

          {(snapshotLoading ||
            snapshotError ||
            snapshotSource) && (
            <div className="border-b border-white/10 px-5 py-2 text-[10px] text-neutral-500 md:px-8 xl:px-10">
              {snapshotLoading
                ? "Loading Pal snapshot…"
                : snapshotError
                  ? `Snapshot unavailable: ${snapshotError}`
                  : snapshotSource === "cloud"
                    ? "Cloud snapshot · private authenticated data"
                    : "Local live-save snapshot"}
            </div>
          )}

          <CollectionSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
            pals={rankings.all}
            onSelect={setSelectedPal}
          />

          <div className="px-5 py-7 md:px-8 xl:px-10">
            {view === "overview" && (
              <Overview
                rankings={rankings}
                onSelect={setSelectedPal}
                onNavigate={setView}
              />
            )}

            {view === "combat" && (
              <CombatView
                pals={
                  rankings.all
                }
                onSelect={setSelectedPal}
              />
            )}

            {view === "base" && (
              <BaseView
                pals={rankings.all}
                onSelect={setSelectedPal}
              />
            )}

            {view === "farming" && (
              <FarmingView
                pals={rankings.farming}
                onSelect={setSelectedPal}
              />
            )}

            {view === "support" && (
              <SupportView
                pals={rankings.support}
                onSelect={setSelectedPal}
              />
            )}

            {view === "breeding" && (
              <BreedingView
                pals={rankings.all}
                onSelect={setSelectedPal}
              />
            )}

            {view === "humans" && (
              <CapturedHumansView
                humans={rankings.humans}
              />
            )}

            {view === "special" && (
              <SpecialView
                pals={rankings.rare}
                onSelect={setSelectedPal}
              />
            )}

            {view === "cleanup" && (
              <CleanupView
                groups={
                  rankings.speciesGroups
                }
                onSelect={setSelectedPal}
              />
            )}
          </div>
        </div>

        {selectedPal && (
          <PalDetailPanel
            rankedPal={selectedPal}
            allPals={rankings.all}
            onSelect={setSelectedPal}
            onClose={() =>
              setSelectedPal(null)
            }
          />
        )}
      </div>
    </main>
  );
}

function Sidebar({
  view,
  setView,
  total,
  species,
}: {
  view: View;
  setView: (view: View) => void;
  total: number;
  species: number;
}) {
  const items: {
    id: View;
    label: string;
    description: string;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      description:
        "Collection summary",
    },
    {
      id: "combat",
      label: "Combat",
      description:
        "Best fighters",
    },
    {
      id: "base",
      label: "Base",
      description:
        "Best workers",
    },
    {
      id: "farming",
      label: "Farming",
      description:
        "Ranch & food production",
    },
    {
      id: "support",
      label: "Support",
      description:
        "Player & party buffs",
    },
    {
      id: "breeding",
      label: "Breeding",
      description:
        "Best breeding stock",
    },
    {
      id: "humans",
      label: "Captured Humans",
      description:
        "NPCs kept separate",
    },
    {
      id: "special",
      label: "Special",
      description:
        "Rare & protected",
    },
    {
      id: "cleanup",
      label: "Cleanup",
      description:
        "Redundant copies",
    },
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#101318] p-5 lg:block">
      <div className="px-2">
        <p className="text-[10px] uppercase tracking-[0.35em] text-neutral-500">
          Rebel
        </p>

        <h1 className="mt-2 text-xl font-semibold">
          Palworld
        </h1>

        <p className="mt-1 text-xs text-neutral-500">
          Collection Intelligence
        </p>
      </div>

      <nav className="mt-9 space-y-1">
        <Link
          href="/world"
          className="mb-3 block w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-neutral-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
        >
          <p className="text-sm font-medium">
            World
          </p>

          <p className="mt-0.5 text-[10px] text-neutral-600">
            Bases & world overview →
          </p>
        </Link>

        {items.map((item) => {
          const active =
            view === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setView(item.id)
              }
              className={[
                "w-full rounded-xl px-4 py-3 text-left transition",
                active
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <p className="text-sm font-medium">
                {item.label}
              </p>

              <p className="mt-0.5 text-[10px] text-neutral-600">
                {item.description}
              </p>
            </button>
          );
        })}
      </nav>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
          Collection
        </p>

        <p className="mt-2 text-3xl font-semibold">
          {total}
        </p>

        <p className="mt-1 text-xs text-neutral-500">
          {species} species
        </p>
      </div>
    </aside>
  );
}

function TopBar({
  view,
  keep,
  review,
  cleanup,
}: {
  view: View;
  keep: number;
  review: number;
  cleanup: number;
}) {
  const titles: Record<
    View,
    {
      title: string;
      description: string;
    }
  > = {
    overview: {
      title: "My Pals",
      description:
        "A clean summary of what each part of your collection is best used for.",
    },
    combat: {
      title: "Best for Combat",
      description:
        "More combat variety ranked by overall strength, attack, survivability, Alpha status and element.",
    },
    base: {
      title: "Best for Base",
      description:
        "Practical worker rankings by job, balancing work level, traits, food demand and versatility.",
    },
    farming: {
      title: "Best for Farming",
      description:
        "Ranch, planting, watering and gathering options ranked for practical production.",
    },
    support: {
      title: "Best for Player Support",
      description:
        "Pals with traits that buff you or your party without treating those buffs as the Pal's own combat damage.",
    },
    humans: {
      title: "Captured Humans",
      description:
        "Captured NPCs stored in Palworld containers are tracked here and excluded from Pal breeding, work, combat and cleanup rankings.",
    },
    breeding: {
      title: "Best for Breeding",
      description:
        "Broader breeding rankings for IV donors, passive inheritance and strong species copies.",
    },
    special: {
      title: "Special & Protected",
      description:
        "Alpha Pals, rare traits, exceptional IVs and strategically important copies.",
    },
    cleanup: {
      title: "Collection Cleanup",
      description:
        "Species-by-species decisions showing what to keep, conditionally keep and safely remove.",
    },
  };

  const current =
    titles[view];

  return (
    <header className="border-b border-white/10 px-5 py-5 md:px-8 xl:px-10">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">
            Collection Intelligence
          </p>

          <h2 className="mt-2 text-3xl font-semibold">
            {current.title}
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-neutral-500">
            {current.description}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <TopMetric
            label="Keep"
            value={keep}
          />

          <TopMetric
            label="Conditional"
            value={review}
          />

          <TopMetric
            label="Cleanup"
            value={cleanup}
          />
        </div>
      </div>
    </header>
  );
}

function CollectionSearch({
  query,
  onQueryChange,
  pals,
  onSelect,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  pals: RankedRealPal[];
  onSelect: (pal: RankedRealPal) => void;
}) {
  const normalized = query.trim().toLowerCase();

  const matches = normalized
    ? pals
        .filter((entry) => {
          const haystack = [
            entry.pal.species,
            entry.pal.nickname ?? "",
            entry.pal.internalSpeciesId,
            ...entry.pal.elements,
            ...entry.pal.passives.map((passive) => passive.name),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalized);
        })
        .sort((a, b) => b.score.overall - a.score.overall)
        .slice(0, 30)
    : [];

  return (
    <section className="border-b border-white/10 px-5 py-4 md:px-8 xl:px-10">
      <div className="relative">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search Pal, nickname, element or passive..."
          className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-white/25"
        />

        {normalized && (
          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[320px] overflow-y-auto rounded-2xl border border-white/10 bg-[#11151a] p-2 shadow-2xl">
            {matches.length === 0 ? (
              <p className="px-4 py-5 text-sm text-neutral-500">No matching Pals.</p>
            ) : (
              <div className="space-y-1">
                {matches.map((entry) => (
                  <button
                    key={entry.pal.id ?? `${entry.pal.internalSpeciesId}-${entry.score.speciesRank}`}
                    type="button"
                    onClick={() => {
                      onSelect(entry);
                      onQueryChange("");
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a2027]">
                        <PalImage pal={entry.pal} />
                      </div>
                      <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{entry.pal.nickname ?? entry.pal.species}</p>
                      <p className="mt-0.5 truncate text-[10px] text-neutral-500">
                        {entry.pal.nickname ? `${entry.pal.species} · ` : ""}
                        Lv.{entry.pal.level ?? "?"}
                        {entry.pal.gender ? ` · ${entry.pal.gender}` : ""}
                        {entry.pal.progression?.condensation?.stars
                          ? ` · ${"★".repeat(entry.pal.progression.condensation.stars)}`
                          : ""}
                      </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{entry.score.overall.toFixed(0)}</p>
                      <p className="text-[9px] uppercase tracking-wide text-neutral-600">Overall</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function TopMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-20 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-center">
      <p className="text-[9px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {value}
      </p>
    </div>
  );
}

type Rankings =
  ReturnType<
    typeof rankRealPals
  >;

function Overview({
  rankings,
  onSelect,
  onNavigate,
}: {
  rankings: Rankings;
  onSelect: (
    pal: RankedRealPal,
  ) => void;
  onNavigate: (
    view: View,
  ) => void;
}) {
  const bestCombat =
    rankings.combatKeepers.slice(
      0,
      8,
    );

  const bestBreeding =
    rankings.breedingKeepers.slice(
      0,
      8,
    );

  const special =
    rankings.rare.slice(
      0,
      8,
    );

  const baseWinners =
    getDeduplicatedBaseWinners(
      rankings.base,
    ).slice(0, 8);

  return (
    <div className="space-y-10">
      <OverviewSection
        eyebrow="Combat"
        title="Best Fighters"
        description="Your strongest combat recommendations."
        action="View Combat"
        onAction={() =>
          onNavigate("combat")
        }
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {bestCombat.map(
            (
              entry,
              index,
            ) => (
              <CompactHorizontalCard
                key={
                  entry.pal.id ??
                  index
                }
                rankedPal={entry}
                rank={index + 1}
                metricLabel="Combat"
                metricValue={
                  entry.score.combat
                }
                reasons={getTopCombatReasons(
                  entry,
                )}
                onClick={() =>
                  onSelect(entry)
                }
              />
            ),
          )}
        </div>
      </OverviewSection>

      <OverviewSection
        eyebrow="Base"
        title="Best Workers"
        description="A practical base-team overview. Multi-role Pals only appear once."
        action="View Base"
        onAction={() =>
          onNavigate("base")
        }
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {baseWinners.map(
            (group) => (
              <BaseWinnerHorizontal
                key={
                  group.pal.pal.id ??
                  group.pal.pal
                    .internalSpeciesId
                }
                winner={group}
                onClick={() =>
                  onSelect(
                    group.pal,
                  )
                }
              />
            ),
          )}
        </div>
      </OverviewSection>

      <OverviewSection
        eyebrow="Breeding"
        title="Best Breeding Stock"
        description="Your strongest breeders and why they matter."
        action="View Breeding"
        onAction={() =>
          onNavigate("breeding")
        }
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {bestBreeding.map(
            (
              entry,
              index,
            ) => (
              <CompactHorizontalCard
                key={
                  entry.pal.id ??
                  index
                }
                rankedPal={entry}
                rank={index + 1}
                metricLabel="Breeding"
                metricValue={
                  entry.score.breeding
                }
                detail={
                  entry.score
                    .breedingReasons[0]
                }
                onClick={() =>
                  onSelect(entry)
                }
              />
            ),
          )}
        </div>
      </OverviewSection>

      <OverviewSection
        eyebrow="Special"
        title="Protected Pals"
        description="Alpha, rare or strategically valuable Pals."
        action="View Special"
        onAction={() =>
          onNavigate("special")
        }
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {special.map(
            (
              entry,
              index,
            ) => (
              <CompactHorizontalCard
                key={
                  entry.pal.id ??
                  index
                }
                rankedPal={entry}
                metricLabel="Protected"
                metricText={specialReason(
                  entry,
                )}
                onClick={() =>
                  onSelect(entry)
                }
              />
            ),
          )}
        </div>
      </OverviewSection>

      <button
        type="button"
        onClick={() =>
          onNavigate("cleanup")
        }
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:bg-white/[0.06]"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            Cleanup
          </p>

          <p className="mt-2 text-lg font-semibold">
            {
              rankings.summary
                .safeToReplace
            }{" "}
            safe cleanup candidates
          </p>

          <p className="mt-1 text-sm text-neutral-500">
            Compare them against the copies Rebel recommends keeping.
          </p>
        </div>

        <span className="text-sm text-neutral-400">
          Review →
        </span>
      </button>
    </div>
  );
}

function OverviewSection({
  eyebrow,
  title,
  description,
  action,
  onAction,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            {eyebrow}
          </p>

          <h3 className="mt-1 text-xl font-semibold">
            {title}
          </h3>

          <p className="mt-1 text-xs text-neutral-500">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={onAction}
          className="text-xs text-neutral-400 transition hover:text-white"
        >
          {action} →
        </button>
      </div>

      {children}
    </section>
  );
}

function CombatView({
  pals,
  onSelect,
}: {
  pals: RankedRealPal[];
  onSelect: (pal: RankedRealPal) => void;
}) {
  const scoredPals =
    pals.filter(
      (entry) =>
        Boolean(
          entry.pal.combatStats,
        ),
    );

  const unscoredPals =
    pals.filter(
      (entry) =>
        !entry.pal.combatStats,
    );

  const currentPower = [...scoredPals].sort(
    (a, b) => b.score.currentPower - a.score.currentPower,
  );

  const potential = [...scoredPals].sort(
    (a, b) => b.score.combatPotential - a.score.combatPotential,
  );

  const attackMonsters = [...scoredPals]
    .filter((entry) => (entry.pal.ivs.attack ?? 0) >= 85)
    .sort(
      (a, b) =>
        (b.pal.ivs.attack ?? 0) - (a.pal.ivs.attack ?? 0) ||
        b.score.combatPotential - a.score.combatPotential,
    );

  const tanks = [...scoredPals]
    .filter(
      (entry) =>
        (entry.pal.ivs.hp ?? 0) >= 80 ||
        (entry.pal.ivs.defense ?? 0) >= 80,
    )
    .sort((a, b) => {
      const aTank = (a.pal.ivs.hp ?? 0) * 0.55 + (a.pal.ivs.defense ?? 0) * 0.45;
      const bTank = (b.pal.ivs.hp ?? 0) * 0.55 + (b.pal.ivs.defense ?? 0) * 0.45;
      return bTank - aTank;
    });

  const alphaFighters = [...scoredPals]
    .filter((entry) => entry.pal.isAlpha)
    .sort((a, b) => b.score.currentPower - a.score.currentPower);

  const bestBySpecies = [...scoredPals]
    .filter((entry) => entry.score.bestOfSpecies.combat)
    .sort((a, b) => b.score.combatPotential - a.score.combatPotential);

  const elementGroups = getCombatElementGroups(scoredPals);

  return (
    <div className="space-y-12">
      {unscoredPals.length > 0 && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.035] p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300/70">
            Combat Data Coverage
          </p>
          <p className="mt-2 text-sm font-semibold">
            {unscoredPals.length} owned Pals are temporarily excluded from combat rankings
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            Their save data is fine, but Rebel does not yet have a species combat reference record for them. IVs still count for breeding and their base/work rankings remain available.
          </p>
        </section>
      )}

      <CombatSection
        eyebrow="Current"
        title="Current Power"
        description="What is strongest right now, including level, condensation, equipped skills and current investment."
        pals={currentPower}
        onSelect={onSelect}
        metric="currentPower"
      />

      <CombatSection
        eyebrow="Potential"
        title="Combat Potential"
        description="Natural ceiling from species strength, IVs and meaningful Pal combat passives, with less weight on current investment."
        pals={potential}
        onSelect={onSelect}
        metric="potential"
      />

      <CombatSection
        eyebrow="Attack"
        title="Attack Specialists"
        description="High Attack-IV Pals ranked best to worst."
        pals={attackMonsters}
        onSelect={onSelect}
        metric="attack"
      />

      <CombatSection
        eyebrow="Survivability"
        title="Tanks"
        description="High HP and Defense individuals."
        pals={tanks}
        onSelect={onSelect}
        metric="tank"
      />

      {alphaFighters.length > 0 && (
        <CombatSection
          eyebrow="Alpha"
          title="Alpha Fighters"
          description="All Alpha combat options ranked by current power."
          pals={alphaFighters}
          onSelect={onSelect}
          metric="currentPower"
        />
      )}

      {elementGroups.length > 0 && (
        <section>
          <SectionIntro
            title="Element Specialists"
            description="Your strongest fighter for each element represented in the collection."
            count={elementGroups.length}
            countLabel="elements"
          />
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {elementGroups.map(({ element, pal }) => (
              <CompactHorizontalCard
                key={`${element}-${pal.pal.id ?? pal.pal.internalSpeciesId}`}
                rankedPal={pal}
                metricLabel={element}
                metricValue={pal.score.combatPotential}
                reasons={getTopCombatReasons(pal, element)}
                onClick={() => onSelect(pal)}
              />
            ))}
          </div>
        </section>
      )}

      <CombatSection
        eyebrow="Species"
        title="Best Combat Copy by Species"
        description="The fighter Rebel prefers when you own several copies of the same Pal."
        pals={bestBySpecies}
        onSelect={onSelect}
        metric="potential"
      />
    </div>
  );
}

function CombatSection({
  eyebrow,
  title,
  description,
  pals,
  onSelect,
  metric = "combat",
}: {
  eyebrow: string;
  title: string;
  description: string;
  pals:
    RankedRealPal[];
  onSelect: (
    pal: RankedRealPal,
  ) => void;
  metric?:
    | "combat"
    | "currentPower"
    | "potential"
    | "farming"
    | "attack"
    | "tank";
}) {
  if (
    pals.length === 0
  ) {
    return null;
  }

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            {eyebrow}
          </p>

          <h3 className="mt-1 text-xl font-semibold">
            {title}
          </h3>

          <p className="mt-1 max-w-3xl text-xs text-neutral-500">
            {description}
          </p>
        </div>

        <p className="text-xs text-neutral-500">
          {pals.length} Pals
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {pals.map(
          (
            entry,
            index,
          ) => {
            let metricLabel =
              "Combat";

            let metricValue =
              entry.score
                .combat;

            if (metric === "currentPower") {
              metricLabel = "Current Power";
              metricValue = entry.score.currentPower;
            }

            if (metric === "potential") {
              metricLabel = "Potential";
              metricValue = entry.score.combatPotential;
            }

            if (metric === "farming") {
              metricLabel = "Farming";
              metricValue = entry.score.farming;
            }

            if (
              metric ===
              "attack"
            ) {
              metricLabel =
                "Attack IV";

              metricValue =
                entry.pal.ivs
                  .attack ??
                0;
            }

            if (
              metric ===
              "tank"
            ) {
              metricLabel =
                "Tank IV";

              metricValue =
                (entry.pal.ivs
                  .hp ??
                  0) *
                  0.55 +
                (entry.pal.ivs
                  .defense ??
                  0) *
                  0.45;
            }

            return (
              <CompactHorizontalCard
                key={
                  entry.pal
                    .id ??
                  `${entry.pal.internalSpeciesId}-${index}`
                }
                rankedPal={entry}
                rank={index + 1}
                metricLabel={
                  metricLabel
                }
                metricValue={
                  metricValue
                }
                reasons={getTopCombatReasons(
                  entry,
                )}
                onClick={() =>
                  onSelect(
                    entry,
                  )
                }
              />
            );
          },
        )}
      </div>
    </section>
  );
}

function BaseView({
  pals,
  onSelect,
}: {
  pals:
    RankedRealPal[];
  onSelect: (
    pal: RankedRealPal,
  ) => void;
}) {
  return (
    <div className="space-y-12">
      {BASE_JOBS.map(
        (job) => {
          const allCandidates =
            getPalsForJob(
              pals,
              job,
            );

          const candidates =
            getPracticalBaseCandidates(
              allCandidates,
              job,
            ).slice(
              0,
              15,
            );

          if (
            candidates.length ===
            0
          ) {
            return null;
          }

          const profileCounts =
            candidates.reduce(
              (
                counts,
                candidate,
              ) => {
                counts[
                  candidate.profile
                ] =
                  (counts[
                    candidate.profile
                  ] ?? 0) + 1;

                return counts;
              },
              {} as Record<
                BaseCandidateProfile,
                number
              >,
            );

          return (
            <section
              key={job}
            >
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                    Base Role
                  </p>

                  <h3 className="mt-1 text-xl font-semibold">
                    {job}
                  </h3>

                  <p className="mt-1 max-w-3xl text-xs text-neutral-500">
                    Ranked for real base use: work level and useful traits matter most, while food demand and versatility keep the list practical across multiple bases.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "Powerhouse",
                      "Efficient",
                      "Specialist",
                      "Versatile",
                      "Balanced",
                    ] as BaseCandidateProfile[]
                  ).map(
                    (profile) => {
                      const count =
                        profileCounts[
                          profile
                        ] ?? 0;

                      if (
                        count === 0
                      ) {
                        return null;
                      }

                      return (
                        <span
                          key={profile}
                          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[9px] text-neutral-400"
                        >
                          {profile} {count}
                        </span>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {candidates.map(
                  (
                    candidate,
                    index,
                  ) => {
                    const {
                      entry,
                      role,
                      profile,
                      food,
                      activeRoles,
                      practicalScore,
                    } = candidate;

                    return (
                      <CompactHorizontalCard
                        key={
                          entry
                            .pal
                            .id ??
                          `${entry.pal.internalSpeciesId}-${job}-${index}`
                        }
                        rankedPal={
                          entry
                        }
                        rank={
                          index +
                          1
                        }
                        metricLabel={`Work Lv. ${
                          role?.effectiveLevel ?? role?.level ??
                          "—"
                        }`}
                        metricValue={
                          practicalScore
                        }
                        metricText={
                          profile
                        }
                        detail={`${profile} · Food ${formatFoodCost(
                          food,
                        )} · ${activeRoles} active ${
                          activeRoles === 1
                            ? "job"
                            : "jobs"
                        }`}
                        reasons={getBaseCandidateReasons(
                          candidate,
                          job,
                        )}
                        onClick={() =>
                          onSelect(
                            entry,
                          )
                        }
                      />
                    );
                  },
                )}
              </div>

              {allCandidates.length >
                candidates.length && (
                <p className="mt-3 text-[10px] text-neutral-600">
                  Showing the best {candidates.length} practical options from {allCandidates.length} owned Pals that can do {job.toLowerCase()}.
                </p>
              )}
            </section>
          );
        },
      )}
    </div>
  );
}

type BaseCandidateProfile =
  | "Powerhouse"
  | "Efficient"
  | "Specialist"
  | "Versatile"
  | "Balanced";

type PracticalBaseCandidate = {
  entry: RankedRealPal;
  role: RankedRealPal["score"]["workRoles"][number] | undefined;
  profile: BaseCandidateProfile;
  food: number | null;
  activeRoles: number;
  practicalScore: number;
  passiveAdjustment: number;
};

function FarmingView({
  pals,
  onSelect,
}: {
  pals: RankedRealPal[];
  onSelect: (pal: RankedRealPal) => void;
}) {
  const relevant = pals.filter((entry) => entry.score.farming > 0);
  const ranch = relevant
    .filter((entry) => (entry.pal.ranchDrops?.length ?? 0) > 0)
    .sort((a, b) => b.score.farming - a.score.farming);
  const plantation = relevant
    .filter((entry) =>
      entry.score.workRoles.some((role) =>
        ["Planting", "Watering", "Gathering"].includes(role.role),
      ),
    )
    .sort((a, b) => b.score.farming - a.score.farming);

  return (
    <div className="space-y-12">
      <CombatSection
        eyebrow="Production"
        title="Best Farming Pals"
        description="All farming candidates ranked by ranch value and plantation work capability."
        pals={relevant}
        onSelect={onSelect}
        metric="farming"
      />

      {ranch.length > 0 && (
        <section>
          <SectionIntro
            title="Ranch Producers"
            description="Owned Pals with ranch drops, ranked by farming value."
            count={ranch.length}
          />
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {ranch.map((entry, index) => (
              <CompactHorizontalCard
                key={entry.pal.id ?? `${entry.pal.internalSpeciesId}-ranch-${index}`}
                rankedPal={entry}
                rank={index + 1}
                metricLabel="Farming"
                metricValue={entry.score.farming}
                detail={
                  entry.pal.ranchDrops?.length
                    ? `Drops: ${entry.pal.ranchDrops.join(", ")}`
                    : "Ranch producer"
                }
                onClick={() => onSelect(entry)}
              />
            ))}
          </div>
        </section>
      )}

      {plantation.length > 0 && (
        <section>
          <SectionIntro
            title="Plantation Workers"
            description="Planting, Watering and Gathering candidates for crop production."
            count={plantation.length}
          />
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {plantation.map((entry, index) => (
              <CompactHorizontalCard
                key={entry.pal.id ?? `${entry.pal.internalSpeciesId}-plant-${index}`}
                rankedPal={entry}
                rank={index + 1}
                metricLabel="Farming"
                metricValue={entry.score.farming}
                detail={entry.score.workRoles
                  .filter((role) => ["Planting", "Watering", "Gathering"].includes(role.role))
                  .map((role) => `${role.role} Lv.${role.effectiveLevel}`)
                  .join(" · ")}
                onClick={() => onSelect(entry)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


function SupportView({
  pals,
  onSelect,
}: {
  pals: RankedRealPal[];
  onSelect: (
    pal: RankedRealPal,
  ) => void;
}) {
  const relevant =
    pals.filter(
      (entry) =>
        entry.score.support >
        0,
    );

  if (
    relevant.length === 0
  ) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#12161b] p-8 text-center">
        <p className="text-sm text-neutral-400">
          No player-support passives detected in the current collection.
        </p>
      </div>
    );
  }

  return (
    <section>
      <SectionIntro
        title="Player & Party Support"
        description="Vanguard, Stronghold Strategist and similar passives are scored here instead of being mislabeled as self-combat damage."
        count={relevant.length}
      />

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {relevant.map(
          (
            entry,
            index,
          ) => (
            <CompactHorizontalCard
              key={
                entry.pal.id ??
                `${entry.pal.internalSpeciesId}-support-${index}`
              }
              rankedPal={entry}
              rank={index + 1}
              metricLabel="Support"
              metricValue={
                entry.score.support
              }
              reasons={
                entry.score
                  .supportReasons
              }
              onClick={() =>
                onSelect(entry)
              }
            />
          ),
        )}
      </div>
    </section>
  );
}

function BreedingView({
  pals,
  onSelect,
}: {
  pals:
    RankedRealPal[];
  onSelect: (
    pal: RankedRealPal,
  ) => void;
}) {
  const relevant =
    pals.filter(
      (entry) =>
        entry.score
          .breeding >= 55 ||
        entry.score.breedingReasons.some(
          (reason) =>
            !reason.includes(
              "Limited breeding value",
            ),
        ),
    );

  const topOverall =
    [...relevant]
      .sort(
        (a, b) =>
          b.score
            .breeding -
          a.score
            .breeding,
      );

  const exceptionalIvDonors =
    relevant
      .filter((entry) =>
        entry.score.breedingReasons.some(
          (reason) =>
            reason.includes(
              "Perfect",
            ) ||
            reason.includes(
              "Exceptional",
            ) ||
            reason.includes(
              "Elite three-stat",
            ),
        ),
      )
      .sort(
        (a, b) =>
          b.score
            .ivQuality -
          a.score
            .ivQuality,
      );

  const passiveDonors =
    relevant
      .filter((entry) =>
        entry.score.breedingReasons.some(
          (reason) =>
            reason.includes(
              "passive",
            ) ||
            reason.includes(
              "inheritance trait",
            ),
        ),
      )
      .sort(
        (a, b) =>
          b.score
            .breeding -
          a.score
            .breeding,
      );

  const bestBySpecies =
    relevant
      .filter(
        (entry) =>
          entry.score
            .bestOfSpecies
            .breeding,
      )
      .sort(
        (a, b) =>
          b.score
            .breeding -
          a.score
            .breeding,
      );

  return (
    <div className="space-y-12">
      <BreedingSection
        title="Best Overall Breeders"
        description="Your strongest breeding candidates overall."
        pals={topOverall}
        onSelect={onSelect}
      />

      <BreedingSection
        title="Exceptional IV Donors"
        description="Pals carrying exceptionally strong inheritable IVs."
        pals={
          exceptionalIvDonors
        }
        onSelect={onSelect}
      />

      <BreedingSection
        title="Valuable Passive Donors"
        description="Useful passive-trait inheritance candidates."
        pals={
          passiveDonors
        }
        onSelect={onSelect}
      />

      <BreedingSection
        title="Best Breeder by Species"
        description="Rebel's preferred breeding copy for each species."
        pals={bestBySpecies}
        onSelect={onSelect}
      />
    </div>
  );
}

function BreedingSection({
  title,
  description,
  pals,
  onSelect,
}: {
  title: string;
  description: string;
  pals:
    RankedRealPal[];
  onSelect: (
    pal: RankedRealPal,
  ) => void;
}) {
  if (
    pals.length === 0
  ) {
    return null;
  }

  return (
    <section>
      <SectionIntro
        title={title}
        description={
          description
        }
        count={pals.length}
      />

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {pals.map(
          (
            entry,
            index,
          ) => (
            <CompactHorizontalCard
              key={
                entry.pal.id ??
                index
              }
              rankedPal={entry}
              rank={
                index + 1
              }
              metricLabel="Breeding"
              metricValue={
                entry.score
                  .breeding
              }
              detail={
                entry.score
                  .breedingReasons[0]
              }
              onClick={() =>
                onSelect(
                  entry,
                )
              }
            />
          ),
        )}
      </div>
    </section>
  );
}


function CapturedHumansView({
  humans,
}: {
  humans:
    RealOwnedPal[];
}) {
  return (
    <section>
      <SectionIntro
        title="Captured Humans"
        description="These are valid captured characters from your save, but they are not Pal species. Rebel keeps them visible without contaminating Pal rankings."
        count={humans.length}
        countLabel="captured humans"
      />

      {humans.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#12161b] p-8 text-center">
          <p className="text-sm text-neutral-400">
            No captured humans detected.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {humans.map(
            (
              human,
              index,
            ) => (
              <article
                key={
                  human.id ??
                  `${human.internalSpeciesId}-${index}`
                }
                className="rounded-2xl border border-white/10 bg-[#12161b] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">
                      Human NPC
                    </p>

                    <h3 className="mt-1 text-base font-semibold">
                      {human.nickname ??
                        human.species}
                    </h3>

                    <p className="mt-1 text-xs text-neutral-500">
                      Lv.{human.level}
                      {human.gender
                        ? ` · ${human.gender}`
                        : ""}
                    </p>
                  </div>

                  <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[9px] uppercase tracking-wide text-neutral-400">
                    Excluded from Pal AI
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-600">
                    Internal ID
                  </p>

                  <p className="mt-1 break-all text-xs text-neutral-300">
                    {human.internalSpeciesId}
                  </p>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}

function SpecialView({
  pals,
  onSelect,
}: {
  pals:
    RankedRealPal[];
  onSelect: (
    pal: RankedRealPal,
  ) => void;
}) {
  return (
    <section>
      <SectionIntro
        title="Special & Protected"
        description="Pals protected because of Alpha status, rare traits or strategic value."
        count={pals.length}
      />

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {pals.map(
          (
            entry,
            index,
          ) => (
            <CompactHorizontalCard
              key={
                entry.pal.id ??
                index
              }
              rankedPal={entry}
              metricLabel="Protected"
              metricText={specialReason(
                entry,
              )}
              onClick={() =>
                onSelect(
                  entry,
                )
              }
            />
          ),
        )}
      </div>
    </section>
  );
}

function CleanupView({
  groups,
  onSelect,
}: {
  groups:
    SpeciesGroup[];
  onSelect: (
    pal: RankedRealPal,
  ) => void;
}) {
  const [filter, setFilter] =
    useState<CleanupFilter>("all");

  const [query, setQuery] =
    useState("");

  const duplicateGroups =
    groups.filter(
      (group) =>
        group.count > 1,
    );

  const allReviewPals =
    duplicateGroups.flatMap(
      (group) => group.review,
    );

  const reviewBreakdown =
    allReviewPals.reduce(
      (
        counts,
        entry,
      ) => {
        const category =
          entry.score
            .reviewCategory ??
          "Manual Review";

        counts[category] += 1;

        return counts;
      },
      {
        "Possible Upgrade": 0,
        "Breeding Donor": 0,
        "Role Backup": 0,
        "Probably Redundant": 0,
        "Manual Review": 0,
      } as Record<
        ReviewCategory,
        number
      >,
    );

  const cleanupGroups =
    duplicateGroups
      .filter((group) => {
        if (
          filter === "cleanup"
        ) {
          return (
            group.replace.length >
            0
          );
        }

        if (
          filter === "review"
        ) {
          return (
            group.review.length >
            0
          );
        }

        if (
          filter === "keepers"
        ) {
          return (
            group.keep.length >
            0
          );
        }

        return true;
      })
      .filter((group) =>
        group.species
          .toLowerCase()
          .includes(
            query
              .trim()
              .toLowerCase(),
          ),
      )
      .sort((a, b) => {
        const cleanupDiff =
          b.replace.length -
          a.replace.length;

        if (
          cleanupDiff !== 0
        ) {
          return cleanupDiff;
        }

        const probablyRedundantA =
          a.review.filter(
            (entry) =>
              entry.score
                .reviewCategory ===
              "Probably Redundant",
          ).length;

        const probablyRedundantB =
          b.review.filter(
            (entry) =>
              entry.score
                .reviewCategory ===
              "Probably Redundant",
          ).length;

        if (
          probablyRedundantA !==
          probablyRedundantB
        ) {
          return (
            probablyRedundantB -
            probablyRedundantA
          );
        }

        return (
          b.count - a.count
        );
      });

  const allDuplicatePals =
    duplicateGroups.flatMap(
      (group) => [
        ...group.keep,
        ...group.review,
        ...group.replace,
      ],
    );

  const countBucket = (
    bucket: DecisionBucket,
  ) =>
    allDuplicatePals.filter(
      ({ score }) =>
        score.decisionBucket ===
        bucket,
    ).length;

  const totalKeep =
    countBucket("CORE_KEEP");

  const totalUsefulBackup =
    countBucket("USEFUL_BACKUP");

  const totalBorderline =
    countBucket(
      "BORDERLINE_CLEANUP",
    );

  const totalReplace =
    countBucket("SAFE_CLEANUP");

  const totalReview =
    totalUsefulBackup +
    totalBorderline;

  const totalDuplicates =
    duplicateGroups.reduce(
      (sum, group) =>
        sum + group.count,
      0,
    );

  const firstRemoval =
    duplicateGroups
      .flatMap(
        (group) =>
          group.replace,
      )
      .sort(
        (a, b) =>
          a.score.overall -
          b.score.overall,
      )[0];

  const reviewCategories: {
    category: ReviewCategory;
    description: string;
  }[] = [
    {
      category:
        "Possible Upgrade",
      description:
        "Strong enough to compare before deciding.",
    },
    {
      category:
        "Breeding Donor",
      description:
        "Useful IVs, passives or breeding value.",
    },
    {
      category:
        "Role Backup",
      description:
        "Close to a best combat, base or breeding copy.",
    },
    {
      category:
        "Probably Redundant",
      description:
        "Looks removable but failed one strict safety check.",
    },
    {
      category:
        "Manual Review",
      description:
        "Ambiguous enough that Rebel will not guess.",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-[#12161b] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              Cleanup Plan
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              Reduce duplicates without throwing away useful Pals
            </h3>

            <p className="mt-2 max-w-3xl text-sm text-neutral-500">
              Safe removals stay strict. The Review bucket now explains exactly why Rebel is hesitating instead of treating every uncertain Pal the same.
            </p>
          </div>

          {firstRemoval && (
            <button
              type="button"
              onClick={() =>
                onSelect(
                  firstRemoval,
                )
              }
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.07]"
            >
              <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">
                Lowest-risk first removal
              </p>

              <p className="mt-1 text-sm font-semibold">
                {
                  firstRemoval.pal
                    .species
                }{" "}
                · Copy{" "}
                {
                  firstRemoval.score
                    .speciesRank
                }
              </p>

              <p className="mt-1 text-[10px] text-neutral-500">
                Overall{" "}
                {
                  firstRemoval.score.overall.toFixed(
                    0,
                  )
                }
              </p>
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CleanupMetric
          label="Core Keep"
          value={totalKeep}
          description="Definitely valuable copies"
        />

        <CleanupMetric
          label="Useful Backup"
          value={totalUsefulBackup}
          description="Breeding, role or upgrade value"
        />

        <CleanupMetric
          label="Borderline Cleanup"
          value={totalBorderline}
          description="Likely redundant; confirm first"
        />

        <CleanupMetric
          label="Safe Cleanup"
          value={totalReplace}
          description="Lowest-risk redundant copies"
          emphasized
        />
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#12161b] p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              Useful Backup Intelligence
            </p>

            <h3 className="mt-1 text-lg font-semibold">
              Why {totalUsefulBackup} Pals are useful backups
            </h3>

            <p className="mt-1 text-xs text-neutral-500">
              These categories explain why a non-core Pal still has a real purpose. Probably Redundant copies are separated into Borderline Cleanup below.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {reviewCategories.map(
            ({
              category,
              description,
            }) => (
              <ReviewBreakdownCard
                key={category}
                category={category}
                value={
                  reviewBreakdown[
                    category
                  ]
                }
                description={
                  description
                }
              />
            ),
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#12161b] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <CleanupFilterButton
              active={
                filter === "all"
              }
              label="All Duplicates"
              onClick={() =>
                setFilter("all")
              }
            />

            <CleanupFilterButton
              active={
                filter ===
                "cleanup"
              }
              label={`Has Cleanup (${totalReplace})`}
              onClick={() =>
                setFilter(
                  "cleanup",
                )
              }
            />

            <CleanupFilterButton
              active={
                filter ===
                "review"
              }
              label={`Needs Decision (${totalReview})`}
              onClick={() =>
                setFilter(
                  "review",
                )
              }
            />

            <CleanupFilterButton
              active={
                filter ===
                "keepers"
              }
              label="Has Keepers"
              onClick={() =>
                setFilter(
                  "keepers",
                )
              }
            />
          </div>

          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder="Search species..."
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-white/20 xl:w-72"
          />
        </div>
      </section>

      <ProbablyRedundantFocus
        groups={duplicateGroups}
        onSelect={onSelect}
      />

      <div>
        <SectionIntro
          title="Species Decisions"
          description="Conditional keeps now show whether a Pal is an upgrade candidate, breeding donor, role backup, probably redundant or a true manual decision."
          count={
            cleanupGroups.length
          }
          countLabel="species shown"
        />

        {cleanupGroups.length ===
        0 ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-[#12161b] p-8 text-center">
            <p className="text-sm text-neutral-400">
              No species match this filter.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {cleanupGroups.map(
              (group) => (
                <CleanupSpeciesCard
                  key={
                    group.speciesKey
                  }
                  group={group}
                  onSelect={
                    onSelect
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewBreakdownCard({
  category,
  value,
  description,
}: {
  category: ReviewCategory;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-neutral-200">
          {category}
        </p>

        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-semibold text-neutral-200">
          {value}
        </span>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
        {description}
      </p>
    </div>
  );
}

function ProbablyRedundantFocus({
  groups,
  onSelect,
}: {
  groups: SpeciesGroup[];
  onSelect: (
    pal: RankedRealPal,
  ) => void;
}) {
  const candidates =
    groups
      .flatMap(
        (group) =>
          group.review,
      )
      .filter(
        (entry) =>
          entry.score
            .decisionBucket ===
          "BORDERLINE_CLEANUP",
      )
      .sort(
        (a, b) =>
          a.score.overall -
          b.score.overall,
      );

  if (
    candidates.length === 0
  ) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#12161b] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
            Borderline Cleanup
          </p>

          <h3 className="mt-1 text-lg font-semibold">
            Probably Redundant
          </h3>

          <p className="mt-1 max-w-3xl text-xs text-neutral-500">
            Rebel thinks these are likely unnecessary, but one safety rule still prevents an automatic cleanup recommendation.
          </p>
        </div>

        <p className="text-xs text-neutral-500">
          {candidates.length} Pals
        </p>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {candidates.map(
          (entry, index) => (
            <button
              key={
                entry.pal.id ??
                `${entry.pal.internalSpeciesId}-${entry.score.speciesRank}-${index}`
              }
              type="button"
              onClick={() =>
                onSelect(entry)
              }
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#1a2027]">
                <PalImage
                  pal={entry.pal}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {entry.pal.species}
                    </p>

                    <p className="mt-0.5 text-[9px] text-neutral-500">
                      Copy{" "}
                      {entry.score.speciesRank ??
                        "—"}{" "}
                      of{" "}
                      {
                        entry.score
                          .speciesCopyCount
                      }
                    </p>
                  </div>

                  <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-[8px] uppercase tracking-wide text-neutral-400">
                    Probably Redundant
                  </span>
                </div>

                <p className="mt-2 text-[10px] leading-relaxed text-neutral-300">
                  {
                    entry.score
                      .reviewReasons[0] ??
                    "Likely redundant, but still needs a manual check."
                  }
                </p>

                {entry.score
                  .reviewReasons[1] && (
                  <p className="mt-1 text-[9px] leading-relaxed text-neutral-500">
                    {
                      entry.score
                        .reviewReasons[1]
                    }
                  </p>
                )}
              </div>
            </button>
          ),
        )}
      </div>
    </section>
  );
}

function CleanupFilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-2 text-xs transition",
        active
          ? "border-white bg-white text-black"
          : "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/20 hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function CleanupMetric({
  label,
  value,
  description,
  emphasized = false,
}: {
  label: string;
  value: number;
  description: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4",
        emphasized
          ? "border-white/20 bg-white/[0.07]"
          : "border-white/10 bg-[#14181e]",
      ].join(" ")}
    >
      <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-neutral-500">
        {description}
      </p>
    </div>
  );
}

function CleanupSpeciesCard({
  group,
  onSelect,
}: {
  group: SpeciesGroup;
  onSelect: (
    pal: RankedRealPal,
  ) => void;
}) {
  const all = [
    ...group.keep,
    ...group.review,
    ...group.replace,
  ];

  const coreKeep =
    all.filter(
      ({ score }) =>
        score.decisionBucket ===
        "CORE_KEEP",
    );

  const usefulBackup =
    all.filter(
      ({ score }) =>
        score.decisionBucket ===
        "USEFUL_BACKUP",
    );

  const borderline =
    all.filter(
      ({ score }) =>
        score.decisionBucket ===
        "BORDERLINE_CLEANUP",
    );

  const safeCleanup =
    all.filter(
      ({ score }) =>
        score.decisionBucket ===
        "SAFE_CLEANUP",
    );

  const safest =
    [...safeCleanup].sort(
      (a, b) =>
        a.score.overall -
        b.score.overall,
    )[0];

  const best =
    group.bestOverall;

  const bestRoles =
    getBestCopyRoles(best);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#13171c]">
      <div className="flex flex-col gap-5 border-b border-white/10 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#1a2027]">
            <PalImage pal={best.pal} />
          </div>

          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-500">
              Species Decision
            </p>

            <h3 className="mt-1 text-xl font-semibold">
              {group.species}
            </h3>

            <p className="mt-1 text-xs text-neutral-500">
              {group.count} copies owned
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {bestRoles.map(
                (role) => (
                  <span
                    key={role}
                    className="rounded-md bg-white/[0.05] px-2 py-1 text-[9px] text-neutral-400"
                  >
                    {role}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DecisionBadge
            label="Core"
            value={coreKeep.length}
          />

          <DecisionBadge
            label="Backup"
            value={usefulBackup.length}
          />

          <DecisionBadge
            label="Borderline"
            value={borderline.length}
          />

          <DecisionBadge
            label="Cleanup"
            value={safeCleanup.length}
            emphasized={
              safeCleanup.length > 0
            }
          />

          <button
            type="button"
            onClick={() =>
              onSelect(best)
            }
            className="ml-0 rounded-xl border border-white/10 px-3 py-2 text-[10px] text-neutral-300 transition hover:bg-white/5 xl:ml-2"
          >
            Open best copy
          </button>
        </div>
      </div>

      <div className="grid xl:grid-cols-4">
        <CleanupColumn
          title="Core Keep"
          description="Your strongest protected copies."
          entries={coreKeep}
          type="keep"
          onSelect={onSelect}
        />

        <CleanupColumn
          title="Useful Backup"
          description="Has a real role, breeding or upgrade reason."
          entries={usefulBackup}
          type="review"
          onSelect={onSelect}
        />

        <CleanupColumn
          title="Borderline Cleanup"
          description="Probably redundant, but confirm before removing."
          entries={borderline}
          type="review"
          onSelect={onSelect}
        />

        <CleanupColumn
          title="Safe Cleanup"
          description="Lowest-risk redundant copies."
          entries={safeCleanup}
          type="cleanup"
          onSelect={onSelect}
        />
      </div>

      <div className="border-t border-white/10 bg-black/20 px-5 py-4">
        {safest ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">
                First removal candidate
              </p>

              <p className="mt-1 text-sm text-neutral-300">
                Copy{" "}
                {safest.score.speciesRank}
                {" · "}
                {safest.score.redundantReasons[0] ??
                  "Lowest-value redundant copy"}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onSelect(safest)
              }
              className="text-left text-xs text-neutral-400 transition hover:text-white"
            >
              Inspect before removing →
            </button>
          </div>
        ) : borderline.length > 0 ? (
          <p className="text-xs text-neutral-500">
            No automatic cleanup here. {borderline.length} copy{borderline.length === 1 ? "" : "ies"} look redundant but still require confirmation.
          </p>
        ) : (
          <p className="text-xs text-neutral-500">
            No copy of this species is currently marked safe to clean up.
          </p>
        )}
      </div>
    </article>
  );
}

function getBestCopyRoles(
  entry: RankedRealPal,
): string[] {
  const roles: string[] = [];

  if (
    entry.score
      .bestOfSpecies.overall
  ) {
    roles.push("Best overall");
  }

  if (
    entry.score
      .bestOfSpecies.combat
  ) {
    roles.push("Best combat");
  }

  if (
    entry.score
      .bestOfSpecies.base
  ) {
    roles.push("Best base");
  }

  if (
    entry.score
      .bestOfSpecies.breeding
  ) {
    roles.push(
      "Best breeding",
    );
  }

  if (
    entry.pal.isAlpha
  ) {
    roles.push("Alpha");
  }

  return roles;
}

function DecisionBadge({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border px-3 py-2 text-center",
        emphasized
          ? "border-white/20 bg-white/[0.08]"
          : "border-white/10 bg-white/[0.03]",
      ].join(" ")}
    >
      <p className="text-[8px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p className="mt-0.5 text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

function CleanupColumn({
  title,
  description,
  entries,
  type,
  onSelect,
}: {
  title: string;
  description: string;
  entries:
    RankedRealPal[];
  type:
    | "keep"
    | "review"
    | "cleanup";
  onSelect: (
    pal: RankedRealPal,
  ) => void;
}) {
  return (
    <div className="border-t border-white/10 p-5 first:border-t-0 xl:border-r xl:border-t-0 xl:last:border-r-0">
      <div className="min-h-12">
        <p className="text-sm font-semibold">
          {title}
        </p>

        <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
          {description}
        </p>
      </div>

      {entries.length ===
      0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-white/10 px-3 py-5 text-center">
          <p className="text-xs text-neutral-600">
            None
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {entries
            .slice(0, 8)
            .map((entry) => (
              <CleanupDecisionRow
                key={
                  entry.pal
                    .id ??
                  `${entry.pal.internalSpeciesId}-${entry.score.speciesRank}`
                }
                rankedPal={
                  entry
                }
                type={type}
                onClick={() =>
                  onSelect(
                    entry,
                  )
                }
              />
            ))}

          {entries.length >
            8 && (
            <p className="pt-1 text-[10px] text-neutral-600">
              +
              {entries.length -
                8}{" "}
              more copies
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CleanupDecisionRow({
  rankedPal,
  type,
  onClick,
}: {
  rankedPal:
    RankedRealPal;
  type:
    | "keep"
    | "review"
    | "cleanup";
  onClick: () => void;
}) {
  const { pal, score } =
    rankedPal;

  const reason =
    type === "review"
      ? score.reviewReasons[0] ??
        getCleanupReason(
          rankedPal,
          type,
        )
      : getCleanupReason(
          rankedPal,
          type,
        );

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-2.5 text-left transition hover:border-white/15 hover:bg-white/[0.04]"
    >
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1a2027]">
        <PalImage pal={pal} />

        {pal.isAlpha && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-amber-400 px-1 text-[6px] font-bold text-black">
            A
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <p className="shrink-0 text-xs font-medium">
              Copy{" "}
              {score.speciesRank ??
                "—"}
            </p>

            {type === "review" &&
              score.reviewCategory && (
              <ReviewCategoryBadge
                category={
                  score.reviewCategory
                }
              />
            )}
          </div>

          <p className="shrink-0 text-[10px] font-medium text-neutral-300">
            {
              score.overall.toFixed(
                0,
              )
            }
          </p>
        </div>

        <p className="mt-1 text-[9px] text-neutral-500">
          IV{" "}
          {score.ivQuality.toFixed(
            0,
          )}
          {" · "}
          C{" "}
          {score.combat.toFixed(
            0,
          )}
          {" · "}
          B{" "}
          {score.base.toFixed(
            0,
          )}
          {" · "}
          Breed{" "}
          {score.breeding.toFixed(
            0,
          )}
        </p>

        <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-neutral-400">
          {reason}
        </p>

        {type === "review" &&
          score.reviewReasons.length >
            1 && (
          <p className="mt-1 text-[8px] text-neutral-600">
            +
            {score.reviewReasons.length -
              1}{" "}
            more reason
            {score.reviewReasons.length -
              1 ===
            1
              ? ""
              : "s"}
          </p>
        )}
      </div>
    </button>
  );
}

function ReviewCategoryBadge({
  category,
}: {
  category: ReviewCategory;
}) {
  return (
    <span className="truncate rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[7px] uppercase tracking-wide text-neutral-400">
      {category}
    </span>
  );
}

function getCleanupReason(
  entry: RankedRealPal,
  type:
    | "keep"
    | "review"
    | "cleanup",
): string {
  const { score, pal } =
    entry;

  if (
    type === "cleanup"
  ) {
    return (
      score
        .redundantReasons[0] ??
      "Lower-value redundant copy"
    );
  }

  if (
    score.bestOfSpecies
      .overall
  ) {
    return "Best overall copy";
  }

  if (
    score.bestOfSpecies
      .combat
  ) {
    return "Best combat copy";
  }

  if (
    score.bestOfSpecies
      .base
  ) {
    return "Best base copy";
  }

  if (
    score.bestOfSpecies
      .breeding
  ) {
    return "Best breeding copy";
  }

  if (pal.isAlpha) {
    return "Alpha Pal";
  }

  if (
    score.protectionReasons
      .length > 0
  ) {
    return (
      score
        .protectionReasons[0]
    );
  }

  if (
    score.redundantReasons
      .length > 0
  ) {
    return (
      score
        .redundantReasons[0]
    );
  }

  return humanizeAction(
    score.action,
  );
}

function CompactHorizontalCard({
  rankedPal,
  rank,
  metricLabel,
  metricValue,
  metricText,
  detail,
  reasons,
  onClick,
}: {
  rankedPal:
    RankedRealPal;
  rank?: number;
  metricLabel: string;
  metricValue?: number;
  metricText?: string;
  detail?: string;
  reasons?: string[];
  onClick: () => void;
}) {
  const { pal, score } =
    rankedPal;

  const metricGrade =
    metricLabel === "Breeding"
      ? score.breedingGrade
      : metricLabel.startsWith(
            "Work Lv.",
          )
        ? score.baseGrade
        : metricLabel ===
            "Protected"
          ? null
          : score.combatGrade;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[150px] w-full items-center gap-4 rounded-2xl border border-white/10 bg-[#14181e] p-4 text-left transition hover:border-white/20 hover:bg-[#171c22]"
    >
      <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[#1a2027]">
        <PalImage pal={pal} />

        {typeof rank ===
          "number" && (
          <div className="absolute -left-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/80 text-[10px] font-semibold">
            #{rank}
          </div>
        )}

        {pal.isAlpha && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[8px] font-bold uppercase text-black">
            Alpha
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h4 className="truncate text-base font-semibold">
              {pal.species}
            </h4>

            <p className="mt-1 text-[11px] text-neutral-500">
              {pal.level !==
              null
                ? `Level ${pal.level}`
                : "Level unknown"}

              {pal.gender
                ? ` · ${pal.gender}`
                : ""}
            </p>

            {pal.elements
              .length >
              0 && (
              <p className="mt-1 text-[10px] text-neutral-600">
                {pal.elements.join(
                  " / ",
                )}
              </p>
            )}
          </div>

          <div className="shrink-0 text-right">
            {metricGrade && (
              <div className="mb-1 flex justify-end">
                <span className="inline-flex min-w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.07] px-2 py-1 text-sm font-bold text-white">
                  {metricGrade}
                </span>
              </div>
            )}

            {typeof metricValue ===
              "number" && (
              <p className="text-xl font-semibold">
                {metricValue.toFixed(
                  0,
                )}
              </p>
            )}

            {metricText && (
              <p className="max-w-32 text-xs font-medium text-neutral-300">
                {metricText}
              </p>
            )}

            <p className="mt-0.5 text-[9px] uppercase tracking-wide text-neutral-500">
              {metricLabel}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <TinyStat
            label="HP IV"
            value={
              pal.ivs.hp ??
              "—"
            }
          />

          <TinyStat
            label="ATK IV"
            value={
              pal.ivs
                .attack ??
              "—"
            }
          />

          <TinyStat
            label="DEF IV"
            value={
              pal.ivs
                .defense ??
              "—"
            }
          />

          <TinyStat
            label="Food"
            value={
              pal.combatStats
                ?.food ??
              "—"
            }
          />
        </div>

        {reasons &&
          reasons.length >
            0 && (
          <div className="mt-3 rounded-lg bg-black/20 px-3 py-2">
            <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Why it ranks
            </p>

            <div className="mt-1.5 space-y-1">
              {reasons.map(
                (reason) => (
                  <p
                    key={reason}
                    className="text-[10px] leading-relaxed text-neutral-300"
                  >
                    ✓ {reason}
                  </p>
                ),
              )}
            </div>
          </div>
        )}

        {!reasons &&
          detail && (
          <p className="mt-3 line-clamp-2 text-[10px] leading-relaxed text-neutral-300">
            {detail}
          </p>
        )}

        <p className="mt-2 truncate text-[9px] text-neutral-600">
          {humanizeAction(
            score.action,
          )}
        </p>
      </div>
    </button>
  );
}

function BaseWinnerHorizontal({
  winner,
  onClick,
}: {
  winner:
    BaseWinnerGroup;
  onClick: () => void;
}) {
  const { pal, jobs } =
    winner;

  const bestJob =
    [...jobs].sort(
      (a, b) =>
        (b.score ?? 0) -
        (a.score ?? 0),
    )[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[118px] items-center gap-4 rounded-2xl border border-white/10 bg-[#14181e] p-4 text-left transition hover:border-white/20 hover:bg-[#171c22]"
    >
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-[#1a2027]">
        <PalImage
          pal={pal.pal}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">
          {
            pal.pal.species
          }
        </p>

        <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-neutral-500">
          Best base roles
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          {jobs.map(
            (job) => (
              <span
                key={job.job}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-neutral-300"
              >
                {job.job}

                {job.level !==
                  null
                  ? ` Lv.${job.level}`
                  : ""}
              </span>
            ),
          )}
        </div>

        <p className="mt-3 text-[10px] text-neutral-400">
          {humanizeAction(
            pal.score
              .action,
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xl font-semibold">
          {bestJob?.score?.toFixed(
            0,
          ) ?? "—"}
        </p>

        <p className="text-[9px] uppercase tracking-wide text-neutral-500">
          Best Role Score
        </p>
      </div>
    </button>
  );
}

function SectionIntro({
  title,
  description,
  count,
  countLabel = "Pals",
}: {
  title: string;
  description: string;
  count: number;
  countLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <h3 className="text-xl font-semibold">
          {title}
        </h3>

        <p className="mt-1 max-w-3xl text-xs text-neutral-500">
          {description}
        </p>
      </div>

      <p className="text-xs text-neutral-500">
        {count}{" "}
        {countLabel}
      </p>
    </div>
  );
}
function getPartnerSkillDisplay(
  pal: RealOwnedPal,
) {
  const skill = pal.partnerSkill;

  if (!skill) {
    return null;
  }

  const description =
    skill.description ?? "";

  const text =
    description.toLowerCase();

  const tags = new Set(
    skill.tags.map((tag) =>
      tag.toLowerCase(),
    ),
  );

  const glider =
    text.includes("glider") ||
    text.includes("gliding");

  const mount =
    tags.has("mount") ||
    text.includes("can be ridden");

  const ranch =
    tags.has("ranch") ||
    text.includes(
      "assigned to ranch",
    );

  const base =
    tags.has("base") ||
    text.includes(
      "while at a base",
    );

  const healing =
    text.includes("restore") ||
    text.includes("heal");

  const playerSupport =
    text.includes(
      "player's attack",
    ) ||
    text.includes(
      "player attack",
    ) ||
    text.includes(
      "carrying capacity",
    ) ||
    text.includes(
      "player's defense",
    ) ||
    text.includes(
      "player's health",
    ) ||
    healing;

  const combat =
    tags.has("active") &&
    (
      text.includes("enemy") ||
      text.includes("attack") ||
      text.includes("damage") ||
      text.includes("gun") ||
      text.includes("weapon") ||
      text.includes("explosion")
    );

  const loot =
    text.includes("drop") ||
    text.includes("dig") ||
    text.includes("items when defeated");

  let type =
    "Special Utility";

  if (glider) {
    type =
      "Glider / Traversal Utility";
  } else if (
    mount &&
    combat
  ) {
    type =
      "Mounted Combat / Traversal";
  } else if (mount) {
    type =
      "Ground Mount / Traversal";
  } else if (
    playerSupport &&
    combat
  ) {
    type =
      "Player Combat Support";
  } else if (playerSupport) {
    type =
      "Player / Party Support";
  } else if (ranch) {
    type =
      "Ranch Production";
  } else if (base) {
    type =
      "Base Utility";
  } else if (combat) {
    type =
      "Active Combat Ability";
  } else if (loot) {
    type =
      "Loot / Gathering Utility";
  }

  const bestUses: string[] =
    [];

  if (glider || mount) {
    bestUses.push(
      "World traversal",
    );
  }

  if (glider) {
    bestUses.push(
      "Gliding and fall protection",
    );
  }

  if (combat) {
    bestUses.push(
      "Combat utility",
    );
  }

  if (playerSupport) {
    bestUses.push(
      "Player or party support",
    );
  }

  if (base) {
    bestUses.push(
      "Base workforce support",
    );
  }

  if (ranch) {
    bestUses.push(
      "Ranch production",
    );
  }

  if (loot) {
    bestUses.push(
      "Resource collection",
    );
  }

  if (
    bestUses.length === 0
  ) {
    bestUses.push(
      "Specialised utility",
    );
  }

  let interpretation =
    `${skill.name ?? "This Partner Skill"} provides ${type.toLowerCase()}.`;

  if (glider) {
    interpretation +=
      " It is traversal utility, not a player combat or stat-support effect.";
  } else if (
    playerSupport
  ) {
    interpretation +=
      " It can justify keeping this Pal in the party even when it is not the primary fighter.";
  } else if (ranch) {
    interpretation +=
      " Its value comes from the resources it produces while assigned to a Ranch.";
  } else if (base) {
    interpretation +=
      " It adds base value beyond this species' normal Work Suitability.";
  } else if (mount) {
    interpretation +=
      " Its main value is mounted travel rather than Player Support.";
  }

  return {
    name:
      skill.name ??
      "Unknown Partner Skill",

    description:
      description ||
      "Description unavailable.",

    tags: skill.tags,

    type,

    bestUses,

    affects: {
      travel:
        glider || mount,
      combat,
      playerSupport,
      base,
      farming: ranch,
      loot,
    },

    rank:
      (pal.progression
        ?.condensation
        ?.stars ?? 0) + 1,

    scales:
      description.includes(
        "~",
      ),

    interpretation,
  };
}
function PalDetailPanel({
  rankedPal,
  allPals,
  onSelect,
  onClose,
}: {
  rankedPal: RankedRealPal;
  allPals: RankedRealPal[];
  onSelect: (
    pal: RankedRealPal,
  ) => void;
  onClose: () => void;
}) {
  const { pal, score } =
    rankedPal;

  const partnerSkillDisplay =
    getPartnerSkillDisplay(pal);

  const speciesKey =
    pal.internalSpeciesId
      .replace(/^BOSS_/, "")
      .toLowerCase();

  const sameSpecies =
    allPals
      .filter(
        (entry) =>
          entry.pal
            .internalSpeciesId
            .replace(
              /^BOSS_/,
              "",
            )
            .toLowerCase() ===
          speciesKey,
      )
      .sort(
        (a, b) =>
          b.score.overall -
          a.score.overall,
      );

  const bestCopy =
    sameSpecies[0] ?? null;

  const isBestCopy =
    bestCopy === rankedPal;

  const slotNumber =
    pal.location.displaySlot ??
    (pal.slot.slotIndex !== null
      ? pal.slot.slotIndex + 1
      : null);

  const containerLabel =
    pal.location.containerId
      ? `${pal.location.containerId.slice(
          0,
          8,
        )}…${pal.location.containerId.slice(
          -4,
        )}`
      : null;

  const locationTitle =
    pal.location.type === "PARTY"
      ? "Party"
      : pal.location.type === "PALBOX"
        ? "Palbox"
        : pal.location.type === "BASE"
          ? `Base ${pal.location.baseIndex ?? ""}`.trim()
          : pal.location.type === "OTHER"
            ? "Other Character Container"
            : "Unknown Location";

  const slotLabel =
    pal.location.type === "BASE"
      ? "Worker Slot"
      : "Slot";

  const bucketLabel =
    humanizeDecisionBucket(
      score.decisionBucket,
    );

  const recommendationReasons =
    getInspectorReasons(
      rankedPal,
    );

  const comparison =
    bestCopy &&
    !isBestCopy
      ? getBestCopyComparison(
          rankedPal,
          bestCopy,
        )
      : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0"
        onClick={onClose}
      />

      <aside className="relative z-10 h-full w-full max-w-3xl overflow-y-auto border-l border-white/10 bg-[#11151a] shadow-2xl">
        <div className="relative flex h-60 items-center justify-center bg-[#1a2027]">
          <div className="h-36 w-36">
            <PalImage
              pal={pal}
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-sm"
          >
            ×
          </button>

          {pal.isAlpha && (
            <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase text-black">
              Alpha
            </span>
          )}

          <span className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-neutral-300">
            {bucketLabel}
          </span>
        </div>

        <div className="p-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            Pal Inspector
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            {pal.nickname ??
              pal.species}
          </h2>

          {pal.nickname && (
            <p className="mt-1 text-sm text-neutral-500">
              {pal.species}
            </p>
          )}

          <p className="mt-2 text-sm text-neutral-400">
            {pal.level !==
            null
              ? `Level ${pal.level}`
              : "Level unavailable"}

            {pal.gender
              ? ` · ${pal.gender}`
              : ""}

            {score.speciesRank
              ? ` · Copy ${score.speciesRank} of ${score.speciesCopyCount}`
              : ""}
          </p>

          {pal.elements
            .length > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              {pal.elements.join(
                " / ",
              )}
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <PanelHeading>
                  In-game Identity
                </PanelHeading>

                <p className="mt-2 text-sm font-medium">
                  {locationTitle}
                </p>

                <p className="mt-1 text-xs text-neutral-400">
                  {slotNumber !== null
                    ? `${slotLabel} ${slotNumber}`
                    : `${slotLabel} unavailable`}
                  {pal.location.capacity !== null
                    ? ` · ${pal.location.capacity} slot capacity`
                    : ""}
                </p>

                <p className="mt-1 text-[10px] text-neutral-500">
                  {containerLabel
                    ? `Container ${containerLabel}`
                    : "Container unavailable"}
                </p>
              </div>

              <span className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] text-neutral-400">
                {score.speciesRank
                  ? `#${score.speciesRank}`
                  : "—"}
              </span>
            </div>

            {pal.slot.containerId && (
              <p
                title={
                  pal.slot
                    .containerId
                }
                className="mt-3 break-all text-[9px] leading-relaxed text-neutral-600"
              >
                Container ID:{" "}
                {
                  pal.slot
                    .containerId
                }
              </p>
            )}

            <p className="mt-3 text-[9px] leading-relaxed text-neutral-600">
              Rebel resolved this location directly from the current Palworld save data.
              {pal.location.type === "BASE" && pal.location.baseId
                ? ` Base record: ${pal.location.baseId}.`
                : ""}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailMetric label="Overall" value={score.overall} />
            <DetailMetric
              label="Combat Readiness"
              value={
                pal.combatStats
                  ? score.currentPower
                  : "N/A"
              }
            />
            <DetailMetric
              label="Combat Ceiling"
              value={
                pal.combatStats
                  ? score.combatPotential
                  : "N/A"
              }
            />
            <DetailMetric
              label="Expedition"
              value={
                pal.combatStats
                  ? score.expeditionFirepower
                  : "N/A"
              }
            />
            <DetailMetric label="Base" value={score.base} />
            <DetailMetric label="Farming" value={score.farming} />
            <DetailMetric label="Support" value={score.support} />
            <DetailMetric label="Breeding" value={score.breeding} />
            <DetailMetric label="Invest Priority" value={score.investmentPriority} />
          </div>

          <p className="mt-2 text-[9px] leading-relaxed text-neutral-600">
            {pal.combatStats
              ? "Combat Readiness is a Rebel 0–100 readiness index. Combat Ceiling assumes fixable IV Potential can be raised to 100 with fruit while keeping this Pal's current passive set. Expedition is a priority index, not the exact in-game Firepower number."
              : "Combat metrics are intentionally shown as N/A because Rebel does not yet have species combat reference data for this Pal. IV, breeding, base and farming intelligence remain valid."}
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <PanelHeading>Progression & Investment</PanelHeading>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <TinyStat
                label="Condensation"
                value={
                  (pal.progression?.condensation?.stars ?? 0) > 0
                    ? `${"★".repeat(pal.progression?.condensation?.stars ?? 0)} (${pal.progression?.condensation?.stars ?? 0})`
                    : "0★"
                }
              />
              <TinyStat
                label="Condense Progress"
                value={pal.progression?.condensation?.rankUpExp ?? 0}
              />
            </div>

            <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/[0.04] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                  Investment Plan V2
                </p>
                <span className="rounded-md border border-violet-400/20 bg-violet-400/10 px-2 py-1 text-[9px] text-violet-200">
                  {score.investmentPlan.decision.replaceAll("_", " ")}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {Object.entries(score.investmentPlan.actions).map(([action, recommended]) => (
                  <div
                    key={action}
                    className={recommended
                      ? "rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1.5"
                      : "rounded-lg border border-white/5 bg-black/20 px-2 py-1.5"}
                  >
                    <p className={recommended ? "text-[9px] text-emerald-200" : "text-[9px] text-neutral-600"}>
                      {humanizeSkill(action)}: {recommended ? "YES" : "NO"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-3 space-y-1">
                {score.investmentPlan.reasons.map((reason) => (
                  <p key={reason} className="text-[10px] leading-relaxed text-neutral-400">
                    • {reason}
                  </p>
                ))}
              </div>
            </div>

            {score.investmentReasons.length > 0 && (
              <div className="mt-3 space-y-1">
                {score.investmentReasons.map((reason) => (
                  <p key={reason} className="text-[10px] text-neutral-300">✓ {reason}</p>
                ))}
              </div>
            )}

            {(pal.skills?.equipped?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">Equipped Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {pal.skills?.equipped.map((skill) => (
                    <span key={skill} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[9px] text-neutral-300">
                      {humanizeSkill(skill)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(pal.progression?.workSuitabilityUpgrades?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-500">Permanent Work Upgrades</p>
                <div className="mt-2 space-y-1">
                  {pal.progression?.workSuitabilityUpgrades.map((upgrade) => (
                    <p key={`${upgrade.workSuitability}-${upgrade.rank}`} className="text-[10px] text-neutral-300">
                      {upgrade.workSuitability} +{upgrade.rank}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
          {partnerSkillDisplay && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <PanelHeading>
                Partner Skill
              </PanelHeading>

              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">
                    {partnerSkillDisplay.name}
                  </p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-cyan-300">
                    {partnerSkillDisplay.type}
                  </p>
                </div>
                <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[9px] text-neutral-400">
                  Rank {partnerSkillDisplay.rank}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                {partnerSkillDisplay.description}
              </p>

              {partnerSkillDisplay.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {partnerSkillDisplay.tags.map((tag) => (
                    <span key={tag} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] uppercase tracking-wide text-neutral-300">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                    Best Used For
                  </p>
                  <div className="mt-2 space-y-1">
                    {partnerSkillDisplay.bestUses.map((use) => (
                      <p key={use} className="text-[10px] text-neutral-300">✓ {use}</p>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                    Affects
                  </p>
                  <div className="mt-2 space-y-1">
                    {Object.entries(partnerSkillDisplay.affects).map(([area, active]) => (
                      <p key={area} className={active ? "text-[10px] text-neutral-200" : "text-[10px] text-neutral-600"}>
                        {humanizeSkill(area)}: {active ? "YES" : "NO"}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                  Condensation Benefit
                </p>
                <p className="mt-1 text-[10px] leading-relaxed text-neutral-300">
                  {partnerSkillDisplay.scales
                    ? `The documented numeric effect improves with Partner Skill rank. Current rank: ${partnerSkillDisplay.rank}.`
                    : "No rank-scaled numeric range is documented, so Rebel does not invent a condensation benefit."}
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                  Rebel Interpretation
                </p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                  {partnerSkillDisplay.interpretation}
                </p>
              </div>
            </div>
          )}

          {pal.passives
            .length > 0 ? (
            <div className="mt-6">
              <PanelHeading>
                Passives
              </PanelHeading>

              <div className="mt-3 space-y-2">
                {pal.passives.map((passive, index) => {
                  const intelligence =
                    getPassiveTraitIntelligence(passive);

                  const dispositionStyle =
                    intelligence.disposition === "GOOD"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                      : intelligence.disposition === "BAD"
                        ? "border-red-400/25 bg-red-400/10 text-red-200"
                        : intelligence.disposition === "CONDITIONAL"
                          ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                          : "border-white/10 bg-white/[0.04] text-neutral-300";

                  return (
                    <div
                      key={`${passive.internalId}-${index}`}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {intelligence.name}
                          </p>
                          <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-neutral-500">
                            {intelligence.categories.join(" · ")}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className={`rounded-md border px-2 py-1 text-[9px] ${dispositionStyle}`}>
                            {intelligence.disposition}
                          </span>
                          {intelligence.tier !== null && (
                            <span className="text-[9px] text-neutral-600">
                              Trait Tier {intelligence.tier}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                        {intelligence.description}
                      </p>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                          <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-600">
                            Best For
                          </p>
                          <div className="mt-1.5 space-y-1">
                            {intelligence.bestFor.map((role) => (
                              <p key={role} className="text-[10px] text-neutral-300">
                                ✓ {role}
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                          <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-600">
                            Rebel Score Category
                          </p>
                          <p className="mt-1.5 text-[10px] text-neutral-300">
                            {intelligence.scoreCategory}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2.5">
                        <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-600">
                          Breeding Usefulness
                        </p>
                        <p className="mt-1 text-[10px] leading-relaxed text-neutral-400">
                          {intelligence.breedingUsefulness}
                        </p>
                      </div>

                      <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2.5">
                        <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-600">
                          Rebel Interpretation
                        </p>
                        <p className="mt-1 text-[10px] leading-relaxed text-neutral-300">
                          {intelligence.interpretation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <PanelHeading>
                Passives
              </PanelHeading>

              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-neutral-500">
                No passive skills recorded.
              </div>
            </div>
          )}

          {pal.speciesUtility && (
            <div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.03] p-4">
              <PanelHeading>
                Species Intelligence
              </PanelHeading>

              <div className="mt-3">
                <p className="text-[9px] uppercase tracking-[0.16em] text-emerald-300">
                  Primary Utility
                </p>
                <p className="mt-1 text-sm font-semibold text-neutral-100">
                  {pal.speciesUtility.primaryUtility}
                </p>
              </div>

              {pal.speciesUtility.speciesRoles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {pal.speciesUtility.speciesRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[9px] text-emerald-100"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                    Best Used For
                  </p>
                  <div className="mt-2 space-y-1">
                    {pal.speciesUtility.bestUsedFor.map((use) => (
                      <p key={use} className="text-[10px] leading-relaxed text-neutral-300">
                        ✓ {use}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                    Rebel Recommendation
                  </p>
                  <div className="mt-2 space-y-1">
                    {Object.entries(pal.speciesUtility.recommendations).map(
                      ([area, recommendation]) => (
                        <p
                          key={area}
                          className="text-[10px] text-neutral-300"
                        >
                          {humanizeSkill(area)}: {recommendation}
                        </p>
                      ),
                    )}
                  </div>
                </div>
              </div>

              {pal.speciesUtility.ranchDrops.length > 0 && (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-500">
                    Ranch Production
                  </p>
                  <p className="mt-1 text-[10px] text-neutral-300">
                    {pal.speciesUtility.ranchDrops.join(" · ")}
                  </p>
                </div>
              )}

              <p className="mt-3 text-[9px] leading-relaxed text-neutral-600">
                Species intelligence describes what every {pal.species} is naturally useful for. Individual IVs, passives and investment below determine how valuable this specific copy is.
              </p>
            </div>
          )}

          <div className="mt-6">
            <PanelHeading>
              Individual IVs
            </PanelHeading>

            <div className="mt-3 grid grid-cols-4 gap-2">
              <TinyStat
                label="HP"
                value={
                  pal.ivs.hp ??
                  "—"
                }
              />

              <TinyStat
                label="Attack"
                value={
                  pal.ivs
                    .attack ??
                  "—"
                }
              />

              <TinyStat
                label="Defense"
                value={
                  pal.ivs
                    .defense ??
                  "—"
                }
              />

              <TinyStat
                label="Average"
                value={
                  score.ivQuality.toFixed(
                    0,
                  )
                }
              />
            </div>
          </div>

          <div className="mt-6">
            <PanelHeading>
              Rebel Decision
            </PanelHeading>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">
                  {bucketLabel}
                </p>

                <span className="rounded-md bg-black/25 px-2 py-1 text-[9px] text-neutral-400">
                  {humanizeAction(
                    score.action,
                  )}
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-600">
                    Primary Use
                  </p>
                  <p className="mt-1 text-xs font-semibold text-neutral-200">
                    {score.bestRole}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-neutral-600">
                    Strategic Value
                  </p>
                  <p className="mt-1 text-xs font-semibold text-neutral-200">
                    {score.breeding >= 80
                      ? "Excellent Breeding Stock"
                      : score.breeding >= 65
                        ? "Strong Breeding Stock"
                        : score.breeding >= 50
                          ? "Useful Breeding Stock"
                          : "Limited Breeding Value"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {recommendationReasons
                  .slice(0, 4)
                  .map(
                    (reason) => (
                      <p
                        key={reason}
                        className="text-xs leading-relaxed text-neutral-300"
                      >
                        • {reason}
                      </p>
                    ),
                  )}
              </div>
            </div>
          </div>

          {bestCopy &&
            !isBestCopy && (
            <div className="mt-6">
              <PanelHeading>
                Keep Instead
              </PanelHeading>

              <button
                type="button"
                onClick={() =>
                  onSelect(
                    bestCopy,
                  )
                }
                className="mt-3 flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#1a2027]">
                  <PalImage
                    pal={
                      bestCopy.pal
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {
                          bestCopy.pal
                            .nickname ??
                          bestCopy.pal
                            .species
                        }
                      </p>

                      <p className="mt-1 text-[10px] text-neutral-500">
                        Best overall copy · Copy{" "}
                        {
                          bestCopy.score
                            .speciesRank
                        }
                      </p>
                    </div>

                    <span className="rounded-md bg-white/[0.06] px-2 py-1 text-xs font-semibold">
                      {
                        bestCopy.score.overall.toFixed(
                          0,
                        )
                      }
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    <TinyStat
                      label="HP"
                      value={
                        bestCopy.pal
                          .ivs.hp ??
                        "—"
                      }
                    />

                    <TinyStat
                      label="ATK"
                      value={
                        bestCopy.pal
                          .ivs.attack ??
                        "—"
                      }
                    />

                    <TinyStat
                      label="DEF"
                      value={
                        bestCopy.pal
                          .ivs.defense ??
                        "—"
                      }
                    />

                    <TinyStat
                      label="Breed"
                      value={
                        bestCopy.score.breeding.toFixed(
                          0,
                        )
                      }
                    />
                  </div>

                  {comparison.length >
                    0 && (
                    <p className="mt-3 text-[10px] leading-relaxed text-neutral-500">
                      {
                        comparison[0]
                      }
                    </p>
                  )}
                </div>
              </button>
            </div>
          )}

          {isBestCopy &&
            score.speciesCopyCount > 1 && (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <PanelHeading>
                Best Same-species Copy
              </PanelHeading>

              <p className="mt-2 text-sm font-medium">
                This is already the copy Rebel would keep first.
              </p>

              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Other copies may still be useful for breeding, base work or role backup, but none rank higher overall.
              </p>
            </div>
          )}

          {score.speciesCopyCount === 1 && (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <PanelHeading>
                Only Copy
              </PanelHeading>

              <p className="mt-2 text-sm font-medium">
                This is your only copy of this species, so Rebel protects it without pretending it won a same-species comparison.
              </p>
            </div>
          )}

          {score.combatReasons
            .length > 0 && (
            <DetailReasonSection
              title="Combat Intelligence"
              reasons={
                score.combatReasons
              }
            />
          )}

          {score.supportReasons
            .length > 0 && (
            <DetailReasonSection
              title="Player Support Intelligence"
              reasons={
                score.supportReasons
              }
            />
          )}

          {score.firepowerReasons
            .length > 0 && (
            <DetailReasonSection
              title="Expedition Firepower Intelligence"
              reasons={
                score.firepowerReasons
              }
            />
          )}

          {score.breedingReasons
            .length > 0 && (
            <DetailReasonSection
              title="Breeding Intelligence"
              reasons={
                score.breedingReasons
              }
            />
          )}

          {score.reviewCategory &&
            score.reviewReasons
              .length > 0 && (
            <div className="mt-6">
              <PanelHeading>
                Decision Intelligence
              </PanelHeading>

              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <ReviewCategoryBadge
                  category={
                    score.reviewCategory
                  }
                />

                <p className="mt-3 text-sm font-medium">
                  Why Rebel assigned this decision
                </p>

                <div className="mt-3 space-y-2">
                  {score.reviewReasons.map(
                    (reason) => (
                      <p
                        key={reason}
                        className="text-xs leading-relaxed text-neutral-400"
                      >
                        • {reason}
                      </p>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {score.workRoles
            .length > 0 && (
            <div className="mt-6">
              <PanelHeading>
                Work Suitability
              </PanelHeading>

              <div className="mt-3 flex flex-wrap gap-2">
                {score.workRoles.map(
                  (role) => (
                    <span
                      key={
                        role.role
                      }
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                    >
                      {
                        role.role
                      }{" "}
                      Lv.{" "}
                      {
                        role.effectiveLevel
                      }
                      {role.effectiveLevel !== role.level
                        ? ` (base ${role.level})`
                        : ""}
                      {" · "}
                      {role.profile}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}

          {score.protectionReasons
            .length > 0 && (
            <DetailReasonSection
              title="Why Keep It"
              reasons={
                score.protectionReasons
              }
            />
          )}

          {score.redundantReasons
            .length > 0 && (
            <DetailReasonSection
              title="Collection Notes"
              reasons={
                score.redundantReasons
              }
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function humanizeDecisionBucket(
  bucket: DecisionBucket,
): string {
  if (
    bucket === "CORE_KEEP"
  ) {
    return "Core Keep";
  }

  if (
    bucket ===
    "USEFUL_BACKUP"
  ) {
    return "Useful Backup";
  }

  if (
    bucket ===
    "BORDERLINE_CLEANUP"
  ) {
    return "Borderline Cleanup";
  }

  return "Safe Cleanup";
}

function removeSingleCopyNoise(
  rankedPal: RankedRealPal,
  reasons: string[],
): string[] {
  if (
    rankedPal.score
      .speciesCopyCount > 1
  ) {
    return reasons;
  }

  return reasons.filter(
    (reason) =>
      !reason
        .toLowerCase()
        .includes(
          "best overall copy",
        ) &&
      !reason
        .toLowerCase()
        .includes(
          "best combat copy",
        ) &&
      !reason
        .toLowerCase()
        .includes(
          "best breeding copy",
        ) &&
      !reason
        .toLowerCase()
        .includes(
          "best base copy",
        ),
  );
}

function getInspectorReasons(
  rankedPal: RankedRealPal,
): string[] {
  const { score } =
    rankedPal;

  if (
    score.decisionBucket ===
    "SAFE_CLEANUP"
  ) {
    return (
      score.redundantReasons
        .length > 0
        ? score.redundantReasons
        : [
            "A stronger same-species copy already covers its useful roles.",
          ]
    );
  }

  if (
    score.decisionBucket ===
    "BORDERLINE_CLEANUP"
  ) {
    return (
      score.reviewReasons
        .length > 0
        ? score.reviewReasons
        : score.redundantReasons
    );
  }

  if (
    score.decisionBucket ===
    "USEFUL_BACKUP"
  ) {
    return (
      score.reviewReasons
        .length > 0
        ? score.reviewReasons
        : score.protectionReasons
    );
  }

  return (
    score.protectionReasons
      .length > 0
      ? score.protectionReasons
      : [
          "This is one of your strongest same-species copies.",
        ]
  );
}

function getBestCopyComparison(
  current: RankedRealPal,
  best: RankedRealPal,
): string[] {
  const reasons: string[] = [];

  const overallGap =
    best.score.overall -
    current.score.overall;

  const combatGap =
    best.score.combat -
    current.score.combat;

  const baseGap =
    best.score.base -
    current.score.base;

  const breedingGap =
    best.score.breeding -
    current.score.breeding;

  if (overallGap > 0) {
    reasons.push(
      `Best copy scores ${overallGap.toFixed(
        0,
      )} points higher overall.`,
    );
  }

  if (combatGap >= 5) {
    reasons.push(
      `Best copy is ${combatGap.toFixed(
        0,
      )} points stronger for combat.`,
    );
  }

  if (baseGap >= 5) {
    reasons.push(
      `Best copy is ${baseGap.toFixed(
        0,
      )} points stronger for base work.`,
    );
  }

  if (breedingGap >= 5) {
    reasons.push(
      `Best copy is ${breedingGap.toFixed(
        0,
      )} points stronger for breeding.`,
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "The best copy edges this one out overall, but they are fairly close.",
    );
  }

  return reasons;
}

function DetailReasonSection({
  title,
  reasons,
}: {
  title: string;
  reasons: string[];
}) {
  return (
    <div className="mt-6">
      <PanelHeading>
        {title}
      </PanelHeading>

      <div className="mt-3 space-y-2">
        {reasons.map(
          (reason) => (
            <div
              key={reason}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-neutral-300"
            >
              ✓ {reason}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-xl bg-black/25 p-3 text-center">
      <p className="text-[9px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold">
        {typeof value === "number"
          ? value.toFixed(0)
          : value}
      </p>
    </div>
  );
}

function PanelHeading({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
      {children}
    </p>
  );
}

function TinyStat({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number;
}) {
  return (
    <div className="rounded-lg bg-black/25 px-2 py-2 text-center">
      <p className="text-[8px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-xs font-medium">
        {value}
      </p>
    </div>
  );
}

function PalImage({
  pal,
}: {
  pal: RealOwnedPal;
}) {
  const rawId =
    pal.internalSpeciesId.trim();

  const stripKnownPrefixes = (
    value: string,
  ) =>
    value.replace(
      /^(?:BOSS_|RAID_|GYM_|PREDATOR_|NPC_|SUMMON_)+/i,
      "",
    );

  const stripKnownSuffixes = (
    value: string,
  ) =>
    value.replace(
      /_(?:BOSS|RAID|GYM|PREDATOR|NPC|SUMMON|ALPHA|OILRIG|TOWER)$/i,
      "",
    );

  const baseId =
    stripKnownPrefixes(
      rawId,
    );

  const simplifiedId =
    stripKnownSuffixes(
      baseId,
    );

  const imageCandidates =
    Array.from(
      new Set(
        [
          baseId,
          simplifiedId,
          rawId,
        ].filter(Boolean),
      ),
    ).map(
      (speciesId) =>
        `/pal-icons/T_${speciesId}_icon_normal.webp`,
    );

  imageCandidates.push(
    "/pal-icons/T_dummy_icon.webp",
  );

  return (
    <img
      src={imageCandidates[0]}
      alt={pal.species}
      data-image-index="0"
      onError={(event) => {
        const image =
          event.currentTarget;

        const currentIndex =
          Number(
            image.dataset
              .imageIndex ??
              "0",
          );

        const nextIndex =
          currentIndex + 1;

        if (
          nextIndex >=
          imageCandidates.length
        ) {
          return;
        }

        image.dataset.imageIndex =
          String(
            nextIndex,
          );

        image.src =
          imageCandidates[
            nextIndex
          ];
      }}
      className="h-full w-full object-contain"
    />
  );
}

function getDeduplicatedBaseWinners(
  pals:
    RankedRealPal[],
): BaseWinnerGroup[] {
  const grouped =
    new Map<
      string,
      BaseWinnerGroup
    >();

  for (
    const job
    of BASE_JOBS
  ) {
    const winner =
      getPalsForJob(
        pals,
        job,
      )[0];

    if (!winner) {
      continue;
    }

    const role =
      winner.score.workRoles.find(
        (entry) =>
          entry.role ===
          job,
      );

    const key =
      winner.pal.id ??
      winner.pal
        .internalSpeciesId;

    const existing =
      grouped.get(key);

    const jobInfo = {
      job,
      level:
        role?.level ??
        null,
      score:
        role?.score ??
        null,
    };

    if (existing) {
      existing.jobs.push(
        jobInfo,
      );
    } else {
      grouped.set(
        key,
        {
          pal: winner,
          jobs: [
            jobInfo,
          ],
        },
      );
    }
  }

  return [
    ...grouped.values(),
  ].sort((a, b) => {
    const aBest =
      Math.max(
        ...a.jobs.map(
          (job) =>
            job.score ??
            0,
        ),
      );

    const bBest =
      Math.max(
        ...b.jobs.map(
          (job) =>
            job.score ??
            0,
        ),
      );

    return (
      bBest - aBest
    );
  });
}

function getPalsForJob(
  pals:
    RankedRealPal[],
  job: string,
) {
  return pals
    .filter((entry) =>
      entry.score.workRoles.some(
        (role) =>
          role.role ===
          job,
      ),
    )
    .sort((a, b) => {
      const aScore =
        a.score.workRoles.find(
          (role) =>
            role.role ===
            job,
        )?.score ?? 0;

      const bScore =
        b.score.workRoles.find(
          (role) =>
            role.role ===
            job,
        )?.score ?? 0;

      return (
        bScore - aScore
      );
    });
}

function getPracticalBaseCandidates(
  pals: RankedRealPal[],
  job: string,
): PracticalBaseCandidate[] {
  return pals
    .map((entry) => {
      const role = entry.score.workRoles.find((item) => item.role === job);
      const food = entry.pal.combatStats?.food ?? null;
      const activeRoles = entry.score.workRoles.filter((item) => item.effectiveLevel > 0).length;

      return {
        entry,
        role,
        profile: role?.profile ?? "Balanced",
        food,
        activeRoles,
        practicalScore: role?.score ?? 0,
        passiveAdjustment: 0,
      };
    })
    .sort((a, b) =>
      b.practicalScore - a.practicalScore ||
      (b.role?.effectiveLevel ?? 0) - (a.role?.effectiveLevel ?? 0) ||
      (b.role?.foodEfficiency ?? 0) - (a.role?.foodEfficiency ?? 0),
    );
}

function getBasePassiveAdjustment(
  entry: RankedRealPal,
  job: string,
): number {
  let adjustment = 0;

  for (
    const passive
    of entry.pal.passives
  ) {
    const name =
      passive.name.toLowerCase();

    const description =
      passive.description
        ?.toLowerCase() ?? "";

    const rank =
      passive.rank ?? 0;

    if (
      description.includes(
        "work speed",
      ) ||
      name === "artisan" ||
      name === "serious" ||
      name.includes(
        "work slave",
      )
    ) {
      adjustment +=
        rank >= 4
          ? 10
          : rank >= 3
            ? 7
            : rank >= 1
              ? 4
              : rank < 0
                ? -6
                : 2;
    }

    if (
      name === "nocturnal" ||
      name === "night owl"
    ) {
      adjustment += 3;
    }

    if (
      job === "Transporting" &&
      (
        description.includes(
          "movement speed",
        ) ||
        name === "swift" ||
        name === "runner"
      )
    ) {
      adjustment +=
        rank >= 4
          ? 7
          : rank >= 2
            ? 4
            : 2;
    }

    if (
      description.includes(
        "work speed",
      ) &&
      rank < 0
    ) {
      adjustment -= 4;
    }
  }

  return Math.max(
    -14,
    Math.min(
      16,
      adjustment,
    ),
  );
}

function getFoodPenalty(
  food: number | null,
): number {
  if (
    food === null ||
    food <= 150
  ) {
    return 0;
  }

  return Math.min(
    14,
    (food - 150) / 32,
  );
}

function getBaseCandidateProfile(
  candidate: Omit<
    PracticalBaseCandidate,
    "profile"
  >,
): BaseCandidateProfile {
  const level =
    candidate.role?.effectiveLevel ?? candidate.role?.level ?? 0;

  if (
    level >= 4 &&
    candidate.practicalScore >=
      52
  ) {
    return "Powerhouse";
  }

  if (
    candidate.food !== null &&
    candidate.food <= 200 &&
    candidate.practicalScore >=
      28
  ) {
    return "Efficient";
  }

  if (
    candidate.activeRoles <= 2 &&
    level >= 2
  ) {
    return "Specialist";
  }

  if (
    candidate.activeRoles >= 4
  ) {
    return "Versatile";
  }

  return "Balanced";
}

function getBaseCandidateReasons(
  candidate: PracticalBaseCandidate,
  job: string,
): string[] {
  const reasons: string[] = [];

  if (
    (candidate.role?.effectiveLevel ?? candidate.role?.level ?? 0) >=
    4
  ) {
    reasons.push(
      `${job} Lv.${candidate.role?.effectiveLevel ?? candidate.role?.level} powerhouse`,
    );
  } else if (
    candidate.role?.effectiveLevel ?? candidate.role?.level
  ) {
    reasons.push(
      `${job} Lv.${candidate.role.effectiveLevel ?? candidate.role.level}`,
    );
  }

  if (
    candidate.passiveAdjustment >=
    5
  ) {
    reasons.push(
      "Useful work traits improve real output",
    );
  }

  if (
    candidate.food !== null &&
    candidate.food <= 200
  ) {
    reasons.push(
      `Low food demand (${candidate.food})`,
    );
  } else if (
    candidate.food !== null &&
    candidate.food >= 450
  ) {
    reasons.push(
      `High food demand (${candidate.food}) is priced into the ranking`,
    );
  }

  if (
    candidate.activeRoles >= 4
  ) {
    reasons.push(
      `${candidate.activeRoles} active jobs make it useful across mixed bases`,
    );
  } else if (
    candidate.activeRoles <= 2
  ) {
    reasons.push(
      "Focused worker with little role dilution",
    );
  }

  return reasons.slice(
    0,
    3,
  );
}

function formatFoodCost(
  food: number | null,
): string {
  return food === null
    ? "—"
    : String(food);
}

function getCombatElementGroups(
  pals:
    RankedRealPal[],
): {
  element: string;
  pal: RankedRealPal;
}[] {
  const bestByElement =
    new Map<
      string,
      RankedRealPal
    >();

  for (
    const entry
    of pals
  ) {
    for (
      const element
      of entry.pal
        .elements
    ) {
      const existing =
        bestByElement.get(
          element,
        );

      if (
        !existing ||
        entry.score
          .combat >
          existing.score
            .combat
      ) {
        bestByElement.set(
          element,
          entry,
        );
      }
    }
  }

  return [
    ...bestByElement.entries(),
  ]
    .map(
      ([
        element,
        pal,
      ]) => ({
        element,
        pal,
      }),
    )
    .sort(
      (a, b) =>
        b.pal.score
          .combat -
        a.pal.score
          .combat,
    );
}

function getTopCombatReasons(
  entry:
    RankedRealPal,
  element?: string,
): string[] {
  const source =
    entry.score
      .combatReasons;

  const selected:
    string[] = [];

  const add = (
    value:
      | string
      | undefined,
  ) => {
    if (
      value &&
      !selected.includes(
        value,
      )
    ) {
      selected.push(
        value,
      );
    }
  };

  if (element) {
    add(
      source.find(
        (reason) =>
          reason
            .toLowerCase()
            .includes(
              element.toLowerCase(),
            ),
      ),
    );
  }

  add(
    source.find(
      (reason) =>
        reason.includes(
          "Best combat copy",
        ),
    ),
  );

  add(
    source.find(
      (reason) =>
        reason.includes(
          "Perfect Attack",
        ) ||
        reason.includes(
          "Exceptional Attack",
        ) ||
        reason.includes(
          "Strong Attack",
        ),
    ),
  );

  add(
    source.find(
      (reason) =>
        reason.includes(
          "Elite combat species",
        ) ||
        reason.includes(
          "Strong combat species",
        ),
    ),
  );

  add(
    source.find(
      (reason) =>
        reason.includes(
          "Combat trait",
        ) ||
        reason.includes(
          "Damage passive",
        ),
    ),
  );

  add(
    source.find(
      (reason) =>
        reason.includes(
          "Perfect HP",
        ) ||
        reason.includes(
          "Exceptional HP",
        ) ||
        reason.includes(
          "Perfect Defense",
        ) ||
        reason.includes(
          "Exceptional Defense",
        ),
    ),
  );

  add(
    source.find(
      (reason) =>
        reason.includes(
          "Alpha fighter",
        ),
    ),
  );

  for (
    const reason
    of source
  ) {
    if (
      selected.length >= 3
    ) {
      break;
    }

    add(reason);
  }

  return selected.slice(
    0,
    3,
  );
}

function specialReason(
  entry:
    RankedRealPal,
): string {
  if (
    entry.pal.isAlpha
  ) {
    return "Alpha Pal";
  }

  return (
    entry.score
      .protectionReasons[0] ??
    "Protected Pal"
  );
}

function humanizeSkill(skill: string): string {
  return skill
    .replace(/^Unique_/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
}

function humanizeAction(
  action: string,
): string {
  switch (action) {
    case "KEEP — BEST COPY":
      return "Best copy you own";

    case "KEEP — COMBAT":
      return "Best combat copy";

    case "KEEP — BASE":
      return "Best base copy";

    case "KEEP — BREEDING":
      return "Great breeding candidate";

    case "KEEP — RARE":
      return "Rare / protected";

    case "KEEP":
      return "Worth keeping";

    case "SAFE TO REPLACE":
      return "Safe cleanup candidate";

    case "REDUNDANT":
      return "Redundant duplicate";

    case "REVIEW":
      return "Review this copy";

    default:
      return action;
  }
}