import {
  getLoadoutIntelligence,
  type ActiveSkillIntelligence,
} from "./active-skill-intelligence";
import type {
  PalPassive,
  RealOwnedPal,
} from "./rank-pals";

export type CombatArchetype =
  | "Striker"
  | "Tank"
  | "Bruiser"
  | "Utility Fighter"
  | "Low Combat Potential"
  | "Unscored";

export type CombatConfidence =
  | "FOUNDATIONAL"
  | "LIMITED";

export type PalCombatIntelligenceV2 = {
  formulaVersion: "combat-v2.1-data-backed";
  confidence: CombatConfidence;
  archetype: CombatArchetype;
  naturalOffense: number;
  naturalDurability: number;
  individualOffense: number;
  individualDurability: number;
  passiveFit: number;
  partnerCombatUtility: number;
  loadoutCompleteness: number;
  loadoutQuality: number;
  equippedSkills: ActiveSkillIntelligence[];
  unknownSkillIds: string[];
  currentReadiness: number;
  generalCeiling: number;
  bestUsedFor: string[];
  strongAgainst: string[];
  weakAgainst: string[];
  strengths: string[];
  limitations: string[];
};

const clamp = (
  value: number,
  min = 0,
  max = 100,
) =>
  Math.max(
    min,
    Math.min(max, value),
  );

const average = (
  values: number[],
) =>
  values.length > 0
    ? values.reduce(
        (sum, value) =>
          sum + value,
        0,
      ) / values.length
    : 0;

const ELEMENTAL_COMBAT_PASSIVES: Record<string, string> = {
  "earth emperor": "Ground",
  "flame emperor": "Fire",
  "lord of lightning": "Electric",
  "lord of the sea": "Water",
  "spirit emperor": "Grass",
  "ice emperor": "Ice",
  "divine dragon": "Dragon",
  "lord of the underworld": "Dark",
  "celestial emperor": "Neutral",
};

const getPassiveDescription = (
  passive: PalPassive,
) =>
  passive.description
    ?.toLowerCase() ?? "";

function isPlayerOnlyPassive(
  passive: PalPassive,
): boolean {
  const description =
    getPassiveDescription(
      passive,
    );

  return (
    description.includes(
      "player attack",
    ) ||
    description.includes(
      "player defense",
    ) ||
    description.includes(
      "player work speed",
    ) ||
    description.includes(
      "player movement speed",
    )
  );
}

function getPassiveFit(
  pal: RealOwnedPal,
): {
  score: number;
  strengths: string[];
  limitations: string[];
} {
  let score = 50;
  const strengths: string[] = [];
  const limitations: string[] = [];

  for (const passive of pal.passives) {
    if (
      isPlayerOnlyPassive(
        passive,
      )
    ) {
      continue;
    }

    const name =
      passive.name.toLowerCase();
    const description =
      getPassiveDescription(
        passive,
      );
    const rank =
      passive.rank ?? 0;
    const passiveElement =
      ELEMENTAL_COMBAT_PASSIVES[name];
    const matchingElement =
      passiveElement
        ? pal.elements.some(
            (element) =>
              element.toLowerCase() ===
              passiveElement.toLowerCase(),
          )
        : false;

    const offense =
      matchingElement ||
      description.includes(
        "attack",
      ) ||
      description.includes(
        "damage",
      ) ||
      [
        "legend",
        "musclehead",
        "ferocious",
        "demon god",
        "serenity",
        "impatient",
        "otherworldly cells",
        "savior",
      ].includes(name);

    const defense =
      description.includes(
        "defense",
      ) ||
      description.includes(
        "incoming",
      ) ||
      description.includes(
        "resist",
      ) ||
      [
        "legend",
        "burly body",
      ].includes(name);

    const incomingResistance =
      description.includes("decrease in incoming") ||
      description.includes("incoming damage reduction");

    const negative =
      rank < 0 ||
      (
        description.includes(
          "decrease",
        ) &&
        !incomingResistance
      ) ||
      [
        "coward",
        "pacifist",
      ].includes(name);

    if (negative) {
      score -= 14;
      limitations.push(
        `${passive.name} reduces combat effectiveness`,
      );
      continue;
    }

    if (offense) {
      score +=
        rank >= 4
          ? 12
          : rank >= 3
            ? 9
            : 5;
      strengths.push(
        matchingElement
          ? `${passive.name} strengthens ${passiveElement} attacks`
          : `${passive.name} supports offense`,
      );
    }

    if (defense) {
      score +=
        rank >= 4
          ? 8
          : rank >= 2
            ? 5
            : 3;
      strengths.push(
        `${passive.name} supports survival`,
      );
    }
  }

  return {
    score: clamp(score),
    strengths,
    limitations,
  };
}

function getPartnerCombatUtility(
  pal: RealOwnedPal,
): {
  score: number;
  reasons: string[];
} {
  const skill =
    pal.partnerSkill;

  if (!skill) {
    return {
      score: 0,
      reasons: [],
    };
  }

  const tags =
    new Set(
      skill.tags.map(
        (tag) =>
          tag.toLowerCase(),
      ),
    );

  const description =
    skill.description
      ?.toLowerCase() ?? "";

  let score = 0;
  const reasons: string[] = [];

  if (tags.has("active")) {
    score += 35;
    reasons.push(
      "Activatable Partner Skill",
    );
  }

  if (
    tags.has("mount") &&
    (
      description.includes("damage") ||
      description.includes("attack") ||
      description.includes("gun") ||
      description.includes("weapon") ||
      description.includes("rapidly fire")
    )
  ) {
    score += 20;
    reasons.push(
      "Mounted combat effect",
    );
  }

  if (
    description.includes(
      "damage multiplier",
    ) ||
    description.includes(
      "attacks targeted enemy",
    ) ||
    description.includes(
      "increases the player's attack",
    ) ||
    description.includes(
      "increases damage",
    )
  ) {
    score += 30;
    reasons.push(
      "Documented combat effect",
    );
  }

  if (
    description.includes(
      "restores hp",
    ) ||
    description.includes(
      "heals",
    ) ||
    description.includes(
      "damage reduction",
    )
  ) {
    score += 25;
    reasons.push(
      "Combat sustain effect",
    );
  }

  return {
    score: clamp(score),
    reasons,
  };
}

function getArchetype(
  offense: number,
  durability: number,
  partnerUtility: number,
): CombatArchetype {
  if (
    offense === 0 &&
    durability === 0
  ) {
    return "Unscored";
  }

  if (
    partnerUtility >= 55
  ) {
    return "Utility Fighter";
  }

  if (
    Math.max(offense, durability) < 45
  ) {
    return "Low Combat Potential";
  }

  if (
    offense >= durability + 12
  ) {
    return "Striker";
  }

  if (
    durability >= offense + 12
  ) {
    return "Tank";
  }

  return "Bruiser";
}

function getBestUses(
  archetype: CombatArchetype,
  elements: string[],
): string[] {
  const uses: string[] = [];

  if (archetype === "Striker") {
    uses.push(
      "Fast damage and offensive pressure",
    );
  } else if (
    archetype === "Tank"
  ) {
    uses.push(
      "Long fights and surviving heavy attacks",
    );
  } else if (
    archetype === "Bruiser"
  ) {
    uses.push(
      "Balanced general combat",
    );
  } else if (
    archetype ===
    "Utility Fighter"
  ) {
    uses.push(
      "Partner Skill-driven combat",
    );
  } else if (
    archetype ===
    "Low Combat Potential"
  ) {
    uses.push(
      "Utility, base work or breeding rather than frontline combat",
    );
  }

  const advantagedElements =
    elements.flatMap(getElementAdvantages);

  if (advantagedElements.length > 0) {
    uses.push(
      `${elements.join(
        " / ",
      )} matchup coverage`,
    );
  }

  return uses;
}

export function calculateCombatIntelligenceV2(
  pal: RealOwnedPal,
): PalCombatIntelligenceV2 {
  if (!pal.combatStats) {
    return {
      formulaVersion:
        "combat-v2.1-data-backed",
      confidence: "LIMITED",
      archetype: "Unscored",
      naturalOffense: 0,
      naturalDurability: 0,
      individualOffense: 0,
      individualDurability: 0,
      passiveFit: 0,
      partnerCombatUtility: 0,
      loadoutCompleteness: 0,
      loadoutQuality: 0,
      equippedSkills: [],
      unknownSkillIds: [],
      currentReadiness: 0,
      generalCeiling: 0,
      bestUsedFor: [],
      strongAgainst: [],
      weakAgainst: [],
      strengths: [],
      limitations: [
        "Species combat reference data is missing",
      ],
    };
  }

  const attackIv =
    pal.ivs.attack ?? 50;
  const hpIv =
    pal.ivs.hp ?? 50;
  const defenseIv =
    pal.ivs.defense ?? 50;

  const naturalOffense =
    pal.combatStats
      .attackPercentile;

  const naturalDurability =
    pal.combatStats.hpPercentile *
      0.52 +
    pal.combatStats
      .defensePercentile *
      0.48;

  const individualOffense =
    naturalOffense * 0.68 +
    attackIv * 0.32;

  const individualDurability =
    naturalDurability * 0.68 +
    (
      hpIv * 0.52 +
      defenseIv * 0.48
    ) *
      0.32;

  const passive =
    getPassiveFit(pal);

  const partner =
    getPartnerCombatUtility(
      pal,
    );

  const equippedSkillIds =
    pal.skills?.equipped ?? [];

  const loadout =
    getLoadoutIntelligence(
      equippedSkillIds,
      pal.elements,
    );

  const equippedSkills =
    equippedSkillIds.length;

  const loadoutCompleteness =
    loadout.completeness;

  const archetype =
    getArchetype(
      individualOffense,
      individualDurability,
      partner.score,
    );

  const generalCeiling =
    clamp(
      individualOffense * 0.36 +
        individualDurability *
          0.29 +
        passive.score * 0.13 +
        partner.score * 0.07 +
        loadout.quality * 0.15,
    );

  const levelReadiness =
    clamp(
      ((pal.level ?? 1) / 70) *
        100,
    );

  const stars =
    pal.progression
      ?.condensation?.stars ?? 0;

  const condensationReadiness =
    clamp(
      (stars / 4) * 100,
    );

  const soulLevels =
    pal.progression?.souls;

  const soulReadiness =
    soulLevels
      ? clamp(
          (
            soulLevels.hp +
            soulLevels.attack +
            soulLevels.defense
          ) /
            60 *
            100,
        )
      : 0;

  const trustReadiness =
    clamp(
      (
        (
          pal.progression
            ?.friendship
            ?.points ?? 0
        ) / 200000
      ) * 100,
    );

  const investmentReadiness =
    55 +
    levelReadiness * 0.20 +
    condensationReadiness *
      0.10 +
    soulReadiness * 0.10 +
    trustReadiness * 0.05;

  const currentReadiness =
    clamp(
      generalCeiling *
        (
          investmentReadiness /
          100
        ) *
        (
          0.85 +
          loadoutCompleteness /
            100 *
            0.15
        ),
    );

  const strengths = [
    ...passive.strengths,
    ...partner.reasons,
  ];

  const strongestSkill =
    [...loadout.skills].sort(
      (a, b) =>
        b.qualityScore -
        a.qualityScore,
    )[0];

  if (strongestSkill) {
    strengths.push(
      `${strongestSkill.name}: ${strongestSkill.power} power / ${strongestSkill.cooldown}s cooldown`,
    );
  }

  const sameElementSkills =
    loadout.skills.filter(
      (skill) =>
        skill.sameElementBonus,
    ).length;

  if (sameElementSkills > 0) {
    strengths.push(
      `${sameElementSkills} equipped skill${sameElementSkills === 1 ? "" : "s"} match this Pal's element`,
    );
  }

  if (naturalOffense >= 85) {
    strengths.unshift(
      "Elite natural Attack",
    );
  }

  if (
    naturalDurability >= 85
  ) {
    strengths.unshift(
      "Elite natural durability",
    );
  }

  const limitations = [
    ...passive.limitations,
    "Enemy-specific elemental advantage is not applied to the general score",
    "Skill animation time, hit reliability and enemy movement are not available in the reference data",
  ];

  const strongAgainst =
    Array.from(
      new Set(
        pal.elements.flatMap(
          getElementAdvantages,
        ),
      ),
    );

  const weakAgainst =
    getElementsStrongAgainst(
      pal.elements,
    );

  return {
    formulaVersion:
      "combat-v2.1-data-backed",
    confidence:
      equippedSkills > 0
        ? "FOUNDATIONAL"
        : "LIMITED",
    archetype,
    naturalOffense:
      clamp(naturalOffense),
    naturalDurability:
      clamp(
        naturalDurability,
      ),
    individualOffense:
      clamp(
        individualOffense,
      ),
    individualDurability:
      clamp(
        individualDurability,
      ),
    passiveFit:
      passive.score,
    partnerCombatUtility:
      partner.score,
    loadoutCompleteness,
    loadoutQuality:
      loadout.quality,
    equippedSkills:
      loadout.skills,
    unknownSkillIds:
      loadout.unknown,
    currentReadiness,
    generalCeiling,
    bestUsedFor:
      getBestUses(
        archetype,
        pal.elements,
      ),
    strongAgainst,
    weakAgainst,
    strengths:
      Array.from(
        new Set(strengths),
      ),
    limitations,
  };
}

export function getElementAdvantages(
  attackingElement: string,
): string[] {
  const advantages: Record<
    string,
    string[]
  > = {
    Fire: ["Grass", "Ice"],
    Water: ["Fire"],
    Electric: ["Water"],
    Grass: ["Ground"],
    Ground: ["Electric"],
    Ice: ["Dragon"],
    Dragon: ["Dark"],
    Dark: ["Neutral"],
  };

  return (
    advantages[
      attackingElement
    ] ?? []
  );
}

export function getElementsStrongAgainst(
  defendingElements: string[],
): string[] {
  const allElements = [
    "Fire",
    "Water",
    "Electric",
    "Grass",
    "Ground",
    "Ice",
    "Dragon",
    "Dark",
    "Neutral",
  ];

  return allElements.filter(
    (attackingElement) =>
      getElementAdvantages(
        attackingElement,
      ).some(
        (target) =>
          defendingElements.includes(
            target,
          ),
      ),
  );
}

export function calculateElementMatchupScore(
  palElements: string[],
  enemyElements: string[],
): number {
  if (
    palElements.length === 0 ||
    enemyElements.length === 0
  ) {
    return 50;
  }

  const advantages =
    palElements.flatMap(
      getElementAdvantages,
    );

  const strongTargets =
    enemyElements.filter(
      (element) =>
        advantages.includes(
          element,
        ),
    ).length;

  return clamp(
    50 +
      strongTargets * 30,
  );
}
