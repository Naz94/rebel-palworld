# Combat Intelligence V2

Combat V2 separates questions that the original single score blended together.

## What the foundation scores

- **Natural offense:** species Attack percentile.
- **Natural durability:** species HP and Defense percentiles.
- **Individual offense:** natural offense plus this copy's Attack IV.
- **Individual durability:** natural durability plus this copy's HP and Defense IVs.
- **Passive fit:** self-combat passives only; player-only support passives are excluded.
- **Partner combat utility:** documented active, mounted, damage, healing, or mitigation effects.
- **Current readiness:** the copy's general ceiling reduced by current level, condensation, combat Soul investment, and Trust.
- **General ceiling:** an explainable blend of offense, durability, passive fit, and Partner Skill combat utility.
- **Archetype:** Striker, Tank, Bruiser, Utility Fighter, or Unscored.
- **Natural matchup:** species-element strengths and weaknesses from the element chart.

## Important honesty boundary

The foundation does **not** yet claim to simulate real DPS. Equipped skill names are available in the save, but the project does not yet have a complete current reference catalogue for:

- active-skill power
- cooldown
- range and projectile behaviour
- status effects
- same-element attack bonus
- move-specific elemental coverage
- enemy defense and fight mechanics

Until those fields are added and validated, Combat V2 labels itself foundational and keeps the limitation visible. It is strongest for comparing copies of the same species and for explaining combat roles. Cross-species comparisons remain guidance rather than exact fight outcomes.

## Next data layer

Add a versioned active-skill catalogue and calculate:

1. power per cooldown cycle
2. same-element bonus eligibility
3. elemental coverage from the equipped three-skill loadout
4. status/control utility
5. short-fight burst versus long-fight sustained output
6. target-specific matchup score
7. raid/boss survival and support value

## Inspector information hierarchy

The default view is decision-first:

1. Rebel recommendation
2. combat role
3. current readiness and ceiling
4. offense and durability
5. strong-against and threatened-by elements
6. progression, Partner Skill, and passives

Repeated reason lists and technical methodology live under **More intelligence and technical details**.
