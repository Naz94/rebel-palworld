"use client";

import { useMemo, useState } from "react";
import {
  breedOutcomes,
  combos as specialCombos,
  findPath,
  label,
  palById,
  pals as breedingPals,
  parentsFor,
  type Pal,
  type ParentPair,
  type PathResult,
} from "./breeding-engine";
import type { RankedRealPal } from "./rank-pals";

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

function ownedSpeciesId(pal: RankedRealPal) {
  const names = [
    pal.pal.referenceIdentity?.canonicalName,
    pal.pal.species,
  ].filter((value): value is string => Boolean(value));
  return breedingPals.find((candidate) =>
    names.some((name) => normalize(name) === normalize(candidate.name)),
  )?.id ?? null;
}

function ownedCopies(pals: RankedRealPal[], speciesId: string) {
  if (!palById.has(speciesId)) return [];
  return pals
    .filter((pal) => ownedSpeciesId(pal) === speciesId)
    .sort((a, b) => b.score.breeding - a.score.breeding);
}

function bestOwnedCopy(pals: RankedRealPal[], speciesId: string) {
  return ownedCopies(pals, speciesId)[0] ?? null;
}

function oppositeGender(a: RankedRealPal, b: RankedRealPal) {
  const first = a.pal.gender?.toLocaleLowerCase();
  const second = b.pal.gender?.toLocaleLowerCase();
  return !first || !second || first !== second;
}

type IvKey = "hp" | "attack" | "defense";

const IV_LABELS: Array<{ key: IvKey; label: string }> = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "ATK" },
  { key: "defense", label: "DEF" },
];

function inheritedIvProjection(
  parentA: RankedRealPal,
  parentB: RankedRealPal,
  key: IvKey,
) {
  const first = parentA.pal.ivs[key];
  const second = parentB.pal.ivs[key];
  if (first == null || second == null) return null;
  const expected = first * 0.3 + second * 0.3 + 50 * 0.4;
  const chanceAtLeast90 =
    (first >= 90 ? 0.3 : 0) +
    (second >= 90 ? 0.3 : 0) +
    0.4 * (11 / 101);
  return {
    expected: Math.round(expected),
    chanceAtLeast90: Math.round(chanceAtLeast90 * 100),
  };
}

function pairOwnedStatus(pair: ParentPair, pals: RankedRealPal[]) {
  const copiesA = ownedCopies(pals, pair.a.id);
  const copiesB = ownedCopies(pals, pair.b.id);
  let compatible:
    | { a: RankedRealPal; b: RankedRealPal; score: number }
    | null = null;

  if (pair.a.id === pair.b.id) {
    for (let i = 0; i < copiesA.length; i += 1) {
      for (let j = i + 1; j < copiesA.length; j += 1) {
        if (!oppositeGender(copiesA[i], copiesA[j])) continue;
        const score = copiesA[i].score.breeding + copiesA[j].score.breeding;
        if (!compatible || score > compatible.score) {
          compatible = { a: copiesA[i], b: copiesA[j], score };
        }
      }
    }
  } else {
    for (const a of copiesA) {
      for (const b of copiesB) {
        if (!oppositeGender(a, b)) continue;
        const score = a.score.breeding + b.score.breeding;
        if (!compatible || score > compatible.score) {
          compatible = { a, b, score };
        }
      }
    }
  }

  return {
    a: compatible?.a ?? copiesA[0] ?? null,
    b: compatible?.b ?? copiesB[0] ?? null,
    ready: Boolean(compatible),
  };
}

function PalOption({ pal }: { pal: Pal }) {
  return <option value={pal.id}>{label(pal)}</option>;
}

function percentAtLeastOne(rate: number, attempts: number) {
  return (1 - Math.pow(1 - rate, attempts)) * 100;
}

export function OwnedBreedingCombos({
  pals,
  onSelect,
}: {
  pals: RankedRealPal[];
  onSelect: (pal: RankedRealPal) => void;
}) {
  const sortedPals = useMemo(
    () => [...breedingPals].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  const ownedIds = useMemo(
    () => [...new Set(pals.map(ownedSpeciesId).filter((id): id is string => Boolean(id)))],
    [pals],
  );
  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);

  const [parentA, setParentA] = useState(ownedIds[0] ?? breedingPals[0]?.id ?? "");
  const [parentB, setParentB] = useState(ownedIds[1] ?? ownedIds[0] ?? breedingPals[1]?.id ?? "");
  const [targetId, setTargetId] = useState(
    breedingPals.find((pal) => pal.name === "Anubis")?.id ?? breedingPals[0]?.id ?? "",
  );
  const [showAllParents, setShowAllParents] = useState(false);
  const [path, setPath] = useState<PathResult | null | undefined>(undefined);
  const [mutationAttempts, setMutationAttempts] = useState(10);
  const [mutationCake, setMutationCake] = useState<"regular" | "vegetable" | "extravagant">("extravagant");

  const outcomes = useMemo(
    () => breedOutcomes(parentA, parentB),
    [parentA, parentB],
  );
  const target = palById.get(targetId) ?? null;
  const targetPairs = useMemo(
    () =>
      targetId
        ? parentsFor(targetId).sort((left, right) => {
            const l = pairOwnedStatus(left, pals);
            const r = pairOwnedStatus(right, pals);
            if (l.ready !== r.ready) return Number(r.ready) - Number(l.ready);
            const lCount = Number(Boolean(l.a)) + Number(Boolean(l.b));
            const rCount = Number(Boolean(r.a)) + Number(Boolean(r.b));
            return rCount - lCount || left.a.name.localeCompare(right.a.name);
          })
        : [],
    [targetId, pals],
  );

  const readyPairs = targetPairs.filter((pair) => pairOwnedStatus(pair, pals).ready);
  const visiblePairs = showAllParents ? targetPairs : targetPairs.slice(0, 20);

  const ownedOpportunities = useMemo(() => {
    const results = new Map<string, { child: Pal; a: string; b: string }>();
    for (let i = 0; i < ownedIds.length; i += 1) {
      for (let j = i; j < ownedIds.length; j += 1) {
        for (const outcome of breedOutcomes(ownedIds[i], ownedIds[j])) {
          if (ownedSet.has(outcome.child.id) || results.has(outcome.child.id)) continue;
          results.set(outcome.child.id, {
            child: outcome.child,
            a: ownedIds[i],
            b: ownedIds[j],
          });
        }
      }
    }
    return [...results.values()].sort(
      (a, b) => a.child.rank - b.child.rank || a.child.name.localeCompare(b.child.name),
    );
  }, [ownedIds, ownedSet]);

  const selectedA = bestOwnedCopy(pals, parentA);
  const selectedB = bestOwnedCopy(pals, parentB);
  const mutationRate = mutationCake === "extravagant" ? 0.03 : 0.01;
  const eggsPerBatch = mutationCake === "vegetable" ? 2 : 1;
  const totalEggs = mutationAttempts * eggsPerBatch;
  const mutationChance = percentAtLeastOne(mutationRate, totalEggs);

  function calculatePath() {
    setPath(targetId ? findPath(ownedIds, targetId) : null);
  }

  return (
    <section>
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5 md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">
          Complete Palworld 1.0 breeding intelligence
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Calculator, reverse lookup and collection route planner
        </h2>
        <p className="mt-2 max-w-4xl text-base leading-7 text-neutral-300">
          Rebel now calculates outcomes from the game-derived breeding ranks and special-combination
          table instead of relying on eight hand-picked recipes. It matches the results against your
          synced collection and ranks owned parent options first.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ["Breeding records", breedingPals.length],
            ["Special override rows", specialCombos.length],
            ["Owned species matched", ownedIds.length],
            ["New Pals ready to breed", ownedOpportunities.length],
          ].map(([name, value]) => (
            <div key={String(name)} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-sm text-neutral-400">{name}</p>
              <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h3 className="text-xl font-semibold">Parents → child</h3>
          <p className="mt-1 text-base text-neutral-400">
            Select any two species to calculate the normal offspring.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[{ value: parentA, set: setParentA, title: "Parent A" }, { value: parentB, set: setParentB, title: "Parent B" }].map((entry) => (
              <label key={entry.title} className="text-sm font-semibold text-neutral-300">
                {entry.title}
                <select
                  value={entry.value}
                  onChange={(event) => entry.set(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-3 text-base text-white"
                >
                  {sortedPals.map((pal) => <PalOption key={pal.id} pal={pal} />)}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4">
            <p className="text-sm uppercase tracking-wide text-neutral-400">Result</p>
            {outcomes.map((outcome) => (
              <div key={`${outcome.child.id}:${outcome.genderNote ?? "default"}`} className="mt-2">
                <p className="text-xl font-semibold text-white">{label(outcome.child)}</p>
                {outcome.genderNote && <p className="mt-1 text-sm text-amber-200">{outcome.genderNote}</p>}
              </div>
            ))}
          </div>
          {selectedA && selectedB && (
            <div className="mt-4 rounded-xl border border-sky-400/15 bg-sky-400/[0.06] p-4">
              <p className="text-sm font-semibold text-sky-200">Projected child IVs from your best copies</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {IV_LABELS.map(({ key, label: statLabel }) => {
                  const projection = inheritedIvProjection(selectedA, selectedB, key);
                  return (
                    <div key={key} className="rounded-lg bg-black/20 p-2">
                      <p className="text-sm text-neutral-400">{statLabel}</p>
                      <p className="mt-1 text-base font-semibold">
                        {projection ? `${projection.expected} · ${projection.chanceAtLeast90}% 90+` : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-sm leading-5 text-neutral-400">
                Each IV independently has a 30% chance from either parent and a 40% random roll from 0–100.
              </p>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h3 className="text-xl font-semibold">Target → all parent combinations</h3>
          <label className="mt-4 block text-sm font-semibold text-neutral-300">
            Target Pal
            <select
              value={targetId}
              onChange={(event) => {
                setTargetId(event.target.value);
                setPath(undefined);
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-3 text-base text-white"
            >
              {sortedPals.map((pal) => <PalOption key={pal.id} pal={pal} />)}
            </select>
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-sm text-neutral-400">All combinations</p>
              <p className="mt-1 text-2xl font-semibold">{targetPairs.length}</p>
            </div>
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-sm text-neutral-400">Ready from your collection</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">{readyPairs.length}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={calculatePath}
            className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-base font-semibold text-emerald-200"
          >
            Find shortest route using my Pals
          </button>
          {path === null && <p className="mt-3 text-base text-amber-200">No collection-only route was found.</p>}
          {path && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="font-semibold">Shortest route: {path.steps.length} breeding step{path.steps.length === 1 ? "" : "s"}</p>
              {path.steps.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-400">You already own {target?.name}.</p>
              ) : (
                <ol className="mt-2 space-y-2 text-sm text-neutral-300">
                  {path.steps.map((step, index) => (
                    <li key={`${step.a}:${step.b}:${step.child}`}>
                      {index + 1}. {palById.get(step.a)?.name} + {palById.get(step.b)?.name} → {palById.get(step.child)?.name}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </article>
      </div>

      <article className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">{target?.name ?? "Target"} parent combinations</h3>
            <p className="mt-1 text-base text-neutral-400">Owned and compatible options appear first.</p>
          </div>
          {targetPairs.length > 20 && (
            <button
              type="button"
              onClick={() => setShowAllParents((value) => !value)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold"
            >
              {showAllParents ? "Show top 20" : `Show all ${targetPairs.length}`}
            </button>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiblePairs.map((pair) => {
            const status = pairOwnedStatus(pair, pals);
            return (
              <div key={`${pair.a.id}:${pair.b.id}:${pair.genderNote ?? "any"}`} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-base font-semibold">{pair.a.name} + {pair.b.name}</p>
                <p className={`mt-1 text-sm ${status.ready ? "text-emerald-300" : "text-neutral-400"}`}>
                  {status.ready ? "READY NOW" : status.a || status.b ? "Missing one compatible parent" : "Parents not owned"}
                </p>
                {pair.genderNote && <p className="mt-1 text-sm text-amber-200">{pair.genderNote}</p>}
                <div className="mt-3 flex gap-2">
                  {status.a && <button type="button" onClick={() => onSelect(status.a!)} className="text-sm text-sky-300">Inspect {pair.a.name}</button>}
                  {status.b && <button type="button" onClick={() => onSelect(status.b!)} className="text-sm text-sky-300">Inspect {pair.b.name}</button>}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h3 className="text-xl font-semibold">New results available now</h3>
          <p className="mt-1 text-base text-neutral-400">
            Species you do not currently own that can be produced using species already in your collection.
          </p>
          <div className="mt-4 space-y-2">
            {ownedOpportunities.slice(0, 20).map((entry) => (
              <button
                type="button"
                key={entry.child.id}
                onClick={() => {
                  setTargetId(entry.child.id);
                  setPath(undefined);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3 text-left"
              >
                <span>
                  <span className="block text-base font-semibold">{entry.child.name}</span>
                  <span className="text-sm text-neutral-400">{palById.get(entry.a)?.name} + {palById.get(entry.b)?.name}</span>
                </span>
                <span className="text-sm text-emerald-300">Ready</span>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-violet-400/20 bg-violet-400/[0.05] p-5">
          <h3 className="text-xl font-semibold">Mutation & Cake calculator</h3>
          <p className="mt-1 text-base leading-6 text-neutral-400">
            Community-measured mutation odds. They are estimates, not an official Pocketpair guarantee.
          </p>
          <label className="mt-4 block text-sm font-semibold text-neutral-300">
            Cake
            <select
              value={mutationCake}
              onChange={(event) => setMutationCake(event.target.value as typeof mutationCake)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-3 text-base"
            >
              <option value="regular">Cake / Mushroom / Special · 1% per egg</option>
              <option value="vegetable">Vegetable Cake · 2 eggs at 1% each</option>
              <option value="extravagant">Extravagant Vegetable Cake · 3% per egg</option>
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold text-neutral-300">
            Cakes / breeding batches
            <input
              type="number"
              min={1}
              max={10000}
              value={mutationAttempts}
              onChange={(event) => setMutationAttempts(Math.max(1, Number(event.target.value) || 1))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-3 text-base"
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-sm text-neutral-400">Eggs produced</p>
              <p className="mt-1 text-2xl font-semibold">{totalEggs}</p>
            </div>
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-sm text-neutral-400">At least one mutation</p>
              <p className="mt-1 text-2xl font-semibold text-violet-200">{mutationChance.toFixed(1)}%</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Average attempts per mutation: about {Math.round(1 / mutationRate)} eggs.
            Vegetable Cake is modeled as two independent 1% eggs per batch.
          </p>
        </article>
      </div>

      <p className="mt-5 text-sm leading-6 text-neutral-500">
        Breeding outcomes use a versioned Palworld 1.0 game-data snapshot. Same-species breeding,
        rank averaging, eligibility rules, tie-breaking, special overrides and gender-specific
        combinations are handled by Rebel. Mutation and IV probabilities are community measurements.
      </p>
    </section>
  );
}
