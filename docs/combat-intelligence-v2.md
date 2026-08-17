# Combat Intelligence V2.1

Combat V2.1 separates collection value from combat ability and uses the same
combat model in both the Inspector and the Combat rankings.

## What the data-backed model scores

- **Natural offense:** species Attack percentile.
- **Natural durability:** species HP and Defense percentiles.
- **Individual offense:** natural offense plus this copy's Attack IV.
- **Individual durability:** natural durability plus this copy's HP and Defense IVs.
- **Passive fit:** self-combat passives only; player-only support passives are excluded.
- **Partner combat utility:** documented active, mounted-weapon, damage, healing, or mitigation effects.
- **Loadout quality:** equipped active-skill power, cooldown efficiency, status utility, and same-element compatibility.
- **Current readiness:** the general ceiling adjusted for current level, condensation, combat Souls, Trust, and loadout completeness.
- **General ceiling:** an explainable blend of offense, durability, passives, Partner Skill, and equipped moves.
- **Archetype:** Striker, Tank, Bruiser, Utility Fighter, Low Combat Potential, or Unscored.
- **Natural matchup:** real strengths and weaknesses from the element chart. Neutral does not receive a fictional offensive advantage.

The active-skill and passive catalogues are derived from the current
`oMaN-Rod/palworld-save-pal` Palworld data used by Rebel's save tooling.
Internal move IDs are resolved to canonical English names in the interface.

## Formula

General ceiling uses:

- 36% individual offense
- 29% individual durability
- 13% passive fit
- 7% Partner Skill combat utility
- 15% equipped loadout quality

Current readiness scales that ceiling using level, condensation, combat Soul
investment, Trust, and whether all equipped move IDs resolved successfully.

## Important honesty boundary

Combat V2.1 is data-backed guidance, not an exact DPS simulator. The reference
catalogue includes move power, cooldown, element, type, descriptions, and
documented status effects. It does not model animation duration, projectile
travel, hit reliability, enemy movement, enemy Defense, arena geometry, or
fight-specific mechanics.

Enemy elemental advantage is displayed separately instead of being baked into
the general score. Use the displayed **Naturally Strong Against** and
**Threatened By** fields when choosing a Pal for a particular enemy.

## Inspector information hierarchy

The default view is decision-first:

1. Rebel recommendation
2. collection value (not mislabeled as combat power)
3. Combat Now and Combat Ceiling
4. offense, durability, and combat role
5. strong-against and threatened-by elements
6. progression, equipped moves, Partner Skill, and passives
7. species utility, IVs, and Work Suitability

Repeated methodology remains under **More technical details**.
