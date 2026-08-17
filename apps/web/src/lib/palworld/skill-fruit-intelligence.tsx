const TREE_POOLS = [
  ["Grassland", "10", "39", "2.56%", "Broad early-game pool"],
  ["Forest", "0 mapped", "39", "2.56%", "Reference pool; no mapped tree locations"],
  ["Desert", "2", "32", "2.70%", "Smaller higher-tier pool"],
  ["Snowfield", "2", "31", "3.23%", "Best equal-weight per-fruit tree odds"],
  ["Volcano", "2", "32", "2.63%", "Some double-weight entries reach 5.26%"],
  ["Sakurajima", "4", "37", "2.70%", "Expanded late-game pool"],
  ["Feybreak", "7", "37", "2.70%", "Strong route density"],
  ["Sunreach", "4", "43", "2.33%", "Includes newer 1.0 skills"],
  ["World Tree", "12", "48", "2.08%", "Largest and newest tree pool"],
];

const TOP_FRUITS = [
  ["Electric", "Lightning Bolt", "450", "20s", "Tree loot"],
  ["Water", "Hydro Laser", "450", "20s", "Tree loot"],
  ["Grass", "Circle Vine", "300", "16s", "Tree loot"],
  ["Ice", "Diamond Rain", "600", "30s", "Tree loot"],
  ["Dark", "Dark Laser", "450", "20s", "Tree loot"],
  ["Ground", "Rocky Impact", "600", "30s", "Merchant · 5,000g"],
  ["Dragon", "Beam Slicer", "350", "16s", "Merchant · 5,000g"],
];

export function SkillFruitIntelligence() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-5 md:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-300">
          Palworld 1.0 Skill Fruit intelligence
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Where to farm and which fruits matter</h2>
        <p className="mt-2 max-w-4xl text-base leading-7 text-neutral-300">
          Tree region changes the loot pool and probability, not which Pal can learn the move.
          Any Pal can use any Skill Fruit. Fruit drops stay separate from owned-Pal combat scores.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <h3 className="text-xl font-semibold">Skill Fruit Tree pools</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-base">
            <thead className="text-sm uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="pb-3">Region</th>
                <th className="pb-3">Locations</th>
                <th className="pb-3">Pool</th>
                <th className="pb-3">Base chance</th>
                <th className="pb-3">Use</th>
              </tr>
            </thead>
            <tbody>
              {TREE_POOLS.map(([region, locations, pool, chance, note]) => (
                <tr key={region} className="border-t border-white/10">
                  <td className="py-3 font-semibold">{region}</td>
                  <td className="py-3">{locations}</td>
                  <td className="py-3">{pool} fruits</td>
                  <td className="py-3">{chance}</td>
                  <td className="py-3 text-neutral-400">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <h3 className="text-xl font-semibold">High-value combat fruits</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TOP_FRUITS.map(([element, skill, power, cooldown, source]) => (
            <article key={skill} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">{element}</p>
              <h4 className="mt-1 text-lg font-semibold">{skill}</h4>
              <p className="mt-2 text-base text-neutral-300">{power} power · {cooldown} cooldown</p>
              <p className="mt-1 text-sm text-neutral-400">{source}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-5">
        <h3 className="text-xl font-semibold">Accuracy boundary</h3>
        <p className="mt-2 text-base leading-7 text-neutral-300">
          Region pool sizes and base rates use the supplied current 1.0 references. Individual
          chest and fruit routes are only shown when their complete game-table record is available.
        </p>
      </section>
    </div>
  );
}
