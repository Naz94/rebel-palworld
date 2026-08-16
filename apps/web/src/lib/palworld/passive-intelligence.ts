import type { PalPassive } from "./rank-pals";

export type PassiveDisposition =
  | "GOOD"
  | "BAD"
  | "CONDITIONAL"
  | "NEUTRAL";

export type PassiveTraitIntelligence = {
  name: string;
  description: string;
  tier: number | null;
  disposition: PassiveDisposition;
  categories: string[];
  bestFor: string[];
  affects: {
    combat: boolean;
    baseWork: boolean;
    movement: boolean;
    playerSupport: boolean;
    survival: boolean;
    breeding: boolean;
  };
  breedingUsefulness: string;
  scoreCategory: string;
  interpretation: string;
};

const WORK_NAMES = new Set([
  "artisan",
  "serious",
  "work slave",
  "remarkable craftsmanship",
  "heart of the immovable king",
  "farmhand",
]);

const COMBAT_NAMES = new Set([
  "legend",
  "lucky",
  "musclehead",
  "ferocious",
  "serenity",
  "impatient",
  "burly body",
]);

const MOVEMENT_NAMES = new Set([
  "swift",
  "runner",
  "nimble",
  "infinite stamina",
]);

const SUPPORT_NAMES = new Set([
  "vanguard",
  "stronghold strategist",
  "motivational leader",
  "mine foreman",
  "logging foreman",
]);

const NEGATIVE_NAMES = new Set([
  "coward",
  "pacifist",
  "brittle",
  "slacker",
  "destructive",
  "bottomless stomach",
  "unstable",
  "downtrodden",
  "clumsy",
  "conceited",
  "glutton",
]);

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

const VERIFIED_DESCRIPTION_FALLBACKS:
  Record<string, string> = {
    artisan:
      "Work Speed +50% (applies to this Pal).",
    ...Object.fromEntries(
      Object.entries(ELEMENTAL_COMBAT_PASSIVES).map(
        ([name, element]) => [
          name,
          "Increases " + element + " attack damage.",
        ],
      ),
    ),
  };

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) values.push(value);
}

export function getPassiveTraitIntelligence(
  passive: PalPassive,
): PassiveTraitIntelligence {
  const name = passive.name || "Unknown Passive";
  const key = name.toLowerCase();
  const description =
    passive.description?.trim() ||
    VERIFIED_DESCRIPTION_FALLBACKS[key] ||
    "No effect description is available in the current reference data.";
  const text = description.toLowerCase();
  const tier = passive.rank;

  const categories: string[] = [];
  const bestFor: string[] = [];

  const work =
    WORK_NAMES.has(key) ||
    text.includes("work speed") ||
    text.includes("work efficiency");

  const movement =
    MOVEMENT_NAMES.has(key) ||
    text.includes("movement speed") ||
    text.includes("sprint speed") ||
    text.includes("stamina");

  const playerSupport =
    SUPPORT_NAMES.has(key) ||
    text.includes("player attack") ||
    text.includes("player's attack") ||
    text.includes("player defense") ||
    text.includes("player's defense") ||
    text.includes("player work speed") ||
    text.includes("player's work speed") ||
    text.includes("mining efficiency") ||
    text.includes("logging efficiency");

  const survival =
    text.includes("defense") ||
    text.includes("damage reduction") ||
    text.includes("max health") ||
    text.includes("health regeneration");

  const elemental =
    key in ELEMENTAL_COMBAT_PASSIVES ||
    /(?:fire|water|grass|electric|ice|ground|dark|dragon|neutral) (?:attack )?damage/.test(text) ||
    /increase in (?:fire|water|grass|electric|ice|ground|dark|dragon|neutral) attack/.test(text);

  const elementalRole =
    ELEMENTAL_COMBAT_PASSIVES[key];

  const combat =
    COMBAT_NAMES.has(key) ||
    elemental ||
    text.includes("attack damage") ||
    text.includes("attack +") ||
    text.includes("attack -") ||
    text.includes("critical damage") ||
    text.includes("skill cooldown") ||
    text.includes("defense +") ||
    text.includes("defense -");

  const explicitNegative =
    NEGATIVE_NAMES.has(key) ||
    (tier ?? 0) < 0 ||
    /(?:attack|defense|work speed|movement speed)\s*-\s*\d/.test(text) ||
    text.includes("decrease") ||
    text.includes("increased hunger") ||
    text.includes("san drops faster");

  const hasTradeoff =
    (text.includes("+") && text.includes("-")) ||
    (text.includes("increase") && text.includes("decrease"));

  let disposition: PassiveDisposition;

  if (hasTradeoff) disposition = "CONDITIONAL";
  else if (explicitNegative) disposition = "BAD";
  else if ((tier ?? 0) > 0 || work || movement || playerSupport || combat || survival) disposition = "GOOD";
  else disposition = "NEUTRAL";

  if (work) {
    addUnique(categories, "Base Work");
    addUnique(
      bestFor,
      key === "farmhand"
        ? "Ranch and Farming workers"
        : "Base workers",
    );
  }

  if (combat) {
    addUnique(categories, elemental ? "Elemental Combat" : "Combat");
    addUnique(
      bestFor,
      elementalRole
        ? elementalRole + " combat builds"
        : elemental
          ? "Matching-element combat builds"
          : "Combat builds",
    );
  }

  if (movement) {
    addUnique(categories, "Movement / Traversal");
    addUnique(bestFor, "Mounts and traversal Pals");
  }

  if (playerSupport) {
    addUnique(categories, "Player Support");
    addUnique(bestFor, "Party support builds");
  }

  if (survival) {
    addUnique(categories, "Survival");
    addUnique(bestFor, "Durable combat Pals");
  }

  if (categories.length === 0) {
    addUnique(categories, disposition === "BAD" ? "Negative Trait" : "General Utility");
    addUnique(bestFor, disposition === "BAD" ? "Avoid inheriting where possible" : "Specialised builds");
  }

  const breedingUseful =
    disposition === "GOOD" &&
    ((tier ?? 0) >= 3 ||
      WORK_NAMES.has(key) ||
      COMBAT_NAMES.has(key) ||
      MOVEMENT_NAMES.has(key) ||
      SUPPORT_NAMES.has(key));

  const breedingUsefulness =
    disposition === "BAD"
      ? "Poor breeding donor. Avoid passing this trait unless a specific build requires the tradeoff."
      : disposition === "CONDITIONAL"
        ? "Conditional donor. Breed it only for a build that benefits from the upside."
        : breedingUseful
          ? "Valuable breeding donor for compatible role-focused offspring."
          : "Usable donor, but normally lower priority than stronger role-specific traits.";

  const scoreCategory =
    disposition === "BAD"
      ? "Penalty"
      : work
        ? "Base Work"
        : playerSupport
          ? "Player Support"
          : movement
            ? "Movement"
            : combat
              ? "Combat"
              : "General Utility";

  let interpretation =
    `${name} is a ${disposition.toLowerCase()} ${categories[0].toLowerCase()} trait.`;

  if (disposition === "BAD") {
    interpretation += " Rebel should not protect a duplicate solely because it carries this trait.";
  } else if (disposition === "CONDITIONAL") {
    interpretation += " Its value depends on whether the intended role benefits from the upside enough to accept the drawback.";
  } else if (breedingUseful) {
    interpretation += " This copy may be worth protecting as a breeding donor when its species, IVs, and other traits also fit the role.";
  } else {
    interpretation += " Judge it together with this copy's species role, IVs, and other passives.";
  }

  return {
    name,
    description,
    tier,
    disposition,
    categories,
    bestFor,
    affects: {
      combat,
      baseWork: work,
      movement,
      playerSupport,
      survival,
      breeding: disposition !== "BAD",
    },
    breedingUsefulness,
    scoreCategory,
    interpretation,
  };
}
