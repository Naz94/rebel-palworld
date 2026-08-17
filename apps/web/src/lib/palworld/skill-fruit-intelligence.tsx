"use client";

import { useMemo, useState } from "react";

const TREE_POOLS = [
  { region: "Grassland", locations: 10, pool: 39, baseChance: 2.56, note: "Broad early-game pool" },
  { region: "Forest", locations: 0, pool: 39, baseChance: 2.56, note: "Pool exists in reference data; no mapped tree locations" },
  { region: "Desert", locations: 2, pool: 32, baseChance: 2.70, note: "Smaller higher-tier pool" },
  { region: "Snowfield", locations: 2, pool: 31, baseChance: 3.23, note: "Best equal-weight per-fruit tree odds" },
  { region: "Volcano", locations: 2, pool: 32, baseChance: 2.63, note: "Some entries have double weight and reach 5.26%" },
  { region: "Sakurajima", locations: 4, pool: 37, baseChance: 2.70, note: "Expanded late-game pool" },
  { region: "Feybreak", locations: 7, pool: 37, baseChance: 2.70, note: "Strong route density" },
  { region: "Sunreach", locations: 4, pool: 43, baseChance: 2.33, note: "Includes newer 1.0 skills" },
  { region: "World Tree", locations: 12, pool: 48, baseChance: 2.08, note: "Largest and newest tree pool" },
] as const;

const TOP_FRUITS = [
  { element: "Electric", skill: "Lightning Bolt", power: 450, cooldown: 20, source: "Tree loot" },
  { element: "Water", skill: "Hydro Laser", power: 450, cooldown: 20, source: "Tree loot" },
  { element: "Grass", skill: "Circle Vine", power: 300, cooldown: 16, source: "Tree loot" },
  { element: "Ice", skill: "Diamond Rain", power: 600, cooldown: 30, source: "Tree loot" },
  { element: "Dark", skill: "Dark Laser", power: 450, cooldown: 20, source: "Tree loot" },
  { element: "Ground", skill: "Rocky Impact", power: 600, cooldown: 30, source: "Merchant · 5,000g" },
  { element: "Dragon", skill: "Beam Slicer", power: 350, cooldown: 16, source: "Merchant · 5,000g" },
] as const;

export function SkillFruitIntelligence() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const wanted = query.trim().toLocaleLowerCase();
    if (!wanted) return TOP_FRUITS;
    return TOP_FRUITS.filter((fruit) =>
      [fruit.element, fruit.skill, fruit.source].some((value) =>
        value.toLocaleLowerCase().includes(wanted),
      ),
    );
  }, [query]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-5 md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-300">
          Palworld 1.0 Skill Fruit intelligence
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Where to farm and which fruits matter</h2>
        <p className="mt-2 max-w-4xl text-base leading-7 text-neutral-300">
          Tree region changes the available loot pool and probability, not the element you are
          allowed to teach. Any Pal can learn a Skill Fruit move. Use this page for farming
          decisions; Rebel keeps these drop odds separate from owned-Pal combat scoring.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <h3 className="text-xl font-semibold">Skill Fruit Tree pools</h3>
        <p className="mt-1 text-base text-neutral-400">
          Equal-weight base chance per listed fruit. Weighted exceptions are called out.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-base">
            <thead className="text-sm uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="pb-3">Region</th>
                <th className="pb-3">Locations</th>
                <th className="pb-3">Pool size</th>
                <th className="pb-3">Base chance</th>
                <th className="pb-3">Use</th>
              </tr>
            </thead>
            <tbody>
              {TREE_POOLS.map((pool) => (
                <tr key={pool.region} className="border-t border-white/10">
                  <td className="py-3 font-semibold">{pool.region}</td>
                  <td className="py-3">{pool.locations}</td>
                  <td className="py-3">{pool.pool} fruits</td>
                  <td className="py-3">{pool.baseChance.toFixed(2)}%</td>
                  <td className="py-3 text-neutral-400">{pool.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <h3 className="text-xl font-semibold">High-value combat fruits</h3>
        <p className="mt-1 text-base text-neutral-400">
          Practical high-power choices. Match element coverage and cooldown to the fighter rather
          than choosing only the largest power number.
        </p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search skill, element or source"
          className="mt-4 w-full rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 text-base"
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.map((fruit) => (
            <article key={fruit.skill} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">{fruit.element}</p>
              <h4 className="mt-1 text-lg font-semibold">{fruit.skill}</h4>
              <p className="mt-2 text-base text-neutral-300">{fruit.power} power · {fruit.cooldown}s cooldown</p>
              <p className="mt-1 text-sm text-neutral-400">{fruit.source}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5">
        <h3 className="text-xl font-semibold">Accuracy boundary</h3>
        <p className="mt-2 text-base leading-7 text-neutral-300">
          Region pool sizes and base rates are from current 1.0 references supplied for Rebel.
          This is not yet a claim that every individual fruit route and chest roll has been
          imported. Rebel will label individual acquisition routes only when their complete
          game-table record is present.
        </p>
      </section>
    </div>
  );
}
