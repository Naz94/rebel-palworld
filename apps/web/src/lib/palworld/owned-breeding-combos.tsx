"use client";

import type { RankedRealPal } from "./rank-pals";

type BreedingRoute = {
  target: string;
  parentA: string;
  parentB: string;
  purpose: string;
  nextStep?: string;
};

const VERIFIED_ROUTES: BreedingRoute[] = [
  {
    target: "Eidrolon",
    parentA: "Jormuntide Ignis",
    parentB: "Anubis",
    purpose: "Late-game Transporting specialist and strong Dragon/Dark project.",
  },
  {
    target: "Beakon",
    parentA: "Dumud",
    parentB: "Relaxaurus",
    purpose: "Electric flying mount and electricity-focused worker.",
  },
  {
    target: "Bakemi",
    parentA: "Dumud",
    parentB: "Relaxaurus Lux",
    purpose: "Useful intermediate parent for current 1.0 breeding chains.",
  },
  {
    target: "Jormuntide",
    parentA: "Relaxaurus Lux",
    parentB: "Blazamut",
    purpose: "Elite Watering worker and parent for Jormuntide Ignis.",
    nextStep: "Breed with Suzaku to continue into Jormuntide Ignis.",
  },
  {
    target: "Jormuntide Ignis",
    parentA: "Jormuntide",
    parentB: "Suzaku",
    purpose: "Elite Kindling worker and important breeding-chain parent.",
    nextStep: "Breed with Anubis to continue into Eidrolon.",
  },
  {
    target: "Braloha",
    parentA: "Relaxaurus Lux",
    parentB: "Loupmoon Cryst",
    purpose: "Current 1.0 Pal route with useful work and collection value.",
  },
  {
    target: "Anubis",
    parentA: "Relaxaurus Lux",
    parentB: "Jormuntide Ignis",
    purpose: "Elite Handiwork and Mining worker with strong combat potential.",
    nextStep: "Breed with Jormuntide Ignis to continue into Eidrolon.",
  },
  {
    target: "Sekhmet",
    parentA: "Bushi",
    parentB: "Jormuntide Ignis",
    purpose: "Strong Fire combat and Kindling breeding target.",
  },
];

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesSpecies(pal: RankedRealPal, species: string) {
  const wanted = normalize(species);
  return [
    pal.pal.species,
    pal.pal.referenceIdentity?.canonicalName ?? "",
    pal.pal.nickname ?? "",
  ].some((value) => normalize(value) === wanted);
}

function copiesOf(pals: RankedRealPal[], species: string) {
  return pals
    .filter((pal) => matchesSpecies(pal, species))
    .sort((a, b) => b.score.breeding - a.score.breeding);
}

function compatibleGender(a: RankedRealPal, b: RankedRealPal) {
  const first = a.pal.gender?.toLocaleLowerCase();
  const second = b.pal.gender?.toLocaleLowerCase();
  if (!first || !second) return true;
  return first !== second;
}

function bestParentPair(
  pals: RankedRealPal[],
  parentA: string,
  parentB: string,
) {
  const copiesA = copiesOf(pals, parentA);
  const copiesB = copiesOf(pals, parentB);

  const compatiblePairs = copiesA.flatMap((a) =>
    copiesB
      .filter((b) => compatibleGender(a, b))
      .map((b) => ({
        parentA: a,
        parentB: b,
        combinedScore: a.score.breeding + b.score.breeding,
      })),
  );

  const bestCompatible = compatiblePairs.sort(
    (a, b) => b.combinedScore - a.combinedScore,
  )[0];

  return {
    parentA: bestCompatible?.parentA ?? copiesA[0] ?? null,
    parentB: bestCompatible?.parentB ?? copiesB[0] ?? null,
    hasCompatiblePair: Boolean(bestCompatible),
    parentACount: copiesA.length,
    parentBCount: copiesB.length,
  };
}

function formatBreedingScore(value: number) {
  return Number(value.toFixed(1)).toString();
}

export function OwnedBreedingCombos({
  pals,
  onSelect,
}: {
  pals: RankedRealPal[];
  onSelect: (pal: RankedRealPal) => void;
}) {
  const routes = VERIFIED_ROUTES.map((route) => {
    const pair = bestParentPair(pals, route.parentA, route.parentB);
    const owned = Number(Boolean(pair.parentA)) + Number(Boolean(pair.parentB));
    return {
      ...route,
      parentACopy: pair.parentA,
      parentBCopy: pair.parentB,
      parentACount: pair.parentACount,
      parentBCount: pair.parentBCount,
      owned,
      gendersWork: owned < 2 || pair.hasCompatiblePair,
    };
  }).sort((a, b) => {
    if (a.owned !== b.owned) return b.owned - a.owned;
    if (a.gendersWork !== b.gendersWork) return Number(b.gendersWork) - Number(a.gendersWork);
    return a.target.localeCompare(b.target);
  });

  const ready = routes.filter((route) => route.owned === 2 && route.gendersWork).length;
  const missingOne = routes.filter((route) => route.owned === 1).length;

  return (
    <section>
      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5 md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">
          Owned breeding opportunities
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Breeding combinations from your collection
        </h2>
        <p className="mt-2 max-w-3xl text-base leading-7 text-neutral-300">
          Rebel checks your synced Pals, chooses the strongest owned breeder for each parent species,
          and flags missing parents or incompatible genders before you spend Cake.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            ["Ready now", ready],
            ["Missing one", missingOne],
            ["Verified routes", routes.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-sm text-neutral-400">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {routes.map((route) => {
          const status =
            route.owned === 2
              ? route.gendersWork
                ? "READY NOW"
                : "NEEDS OPPOSITE GENDER"
              : route.owned === 1
                ? "MISSING ONE PARENT"
                : "PARENTS NOT OWNED";

          return (
            <article
              key={`${route.target}:${route.parentA}:${route.parentB}`}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    Target Pal
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">{route.target}</h3>
                </div>
                <span className={[
                  "rounded-full border px-3 py-1 text-sm font-semibold",
                  status === "READY NOW"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-200",
                ].join(" ")}>
                  {status}
                </span>
              </div>

              <p className="mt-3 text-base leading-6 text-neutral-300">{route.purpose}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    name: route.parentA,
                    pal: route.parentACopy,
                    copies: route.parentACount,
                  },
                  {
                    name: route.parentB,
                    pal: route.parentBCopy,
                    copies: route.parentBCount,
                  },
                ].map((parent) => (
                  <button
                    key={parent.name}
                    type="button"
                    disabled={!parent.pal}
                    onClick={() => parent.pal && onSelect(parent.pal)}
                    className="rounded-xl border border-white/10 bg-black/20 p-4 text-left disabled:cursor-default"
                  >
                    <p className="text-base font-semibold">{parent.name}</p>
                    <p className="mt-1 text-sm text-neutral-400">
                      {parent.pal
                        ? `Best compatible of ${parent.copies} owned · ${parent.pal.pal.gender ?? "gender unknown"} · Breeding ${formatBreedingScore(parent.pal.score.breeding)}`
                        : "Not found in your synced collection"}
                    </p>
                  </button>
                ))}
              </div>

              {route.nextStep && (
                <p className="mt-4 rounded-xl bg-white/[0.04] px-4 py-3 text-sm leading-6 text-neutral-300">
                  Chain route: {route.nextStep}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-sm leading-6 text-neutral-500">
        These are verified Palworld 1.0 starter routes. Rebel deliberately does not invent unverified
        combinations; the complete calculator dataset can expand this same collection-aware engine.
      </p>
    </section>
  );
}
