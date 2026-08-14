import type {
  OwnedPal,
  PalGrade,
  PalRole,
  PalScore,
} from "./types";

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function grade(score: number): PalGrade {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";

  return "D";
}

function calculateBaseScore(pal: OwnedPal): number {
  let score = 20;

  for (const work of pal.workSuitabilities) {
    score += work.level * 6;
  }

  for (const passive of pal.passives) {
    score += passive.baseScore;
  }

  return clampScore(score);
}

function calculateCombatScore(pal: OwnedPal): number {
  let score = 20;

  score += Math.min(pal.level, 60) * 0.5;

  if (pal.ivs?.hp !== undefined) {
    score += pal.ivs.hp * 0.1;
  }

  if (pal.ivs?.attack !== undefined) {
    score += pal.ivs.attack * 0.2;
  }

  if (pal.ivs?.defense !== undefined) {
    score += pal.ivs.defense * 0.1;
  }

  for (const passive of pal.passives) {
    score += passive.combatScore;
  }

  return clampScore(score);
}

function calculateBreedingScore(pal: OwnedPal): number {
  let score = 20;

  for (const passive of pal.passives) {
    score += passive.breedingScore;
  }

  if (pal.ivs) {
    const values = [
      pal.ivs.hp,
      pal.ivs.attack,
      pal.ivs.defense,
    ].filter(
      (value): value is number =>
        value !== undefined,
    );

    if (values.length > 0) {
      const average =
        values.reduce((total, value) => total + value, 0) /
        values.length;

      score += average * 0.25;
    }
  }

  return clampScore(score);
}

function determineBestRole(
  base: number,
  combat: number,
  breeding: number,
): PalRole {
  const highest = Math.max(base, combat, breeding);

  if (highest === base) {
    return "base";
  }

  if (highest === combat) {
    return "combat";
  }

  if (highest === breeding) {
    return "breeding";
  }

  return "general";
}

function determineVerdict(
  bestScore: number,
): PalScore["verdict"] {
  if (bestScore >= 90) {
    return "excellent";
  }

  if (bestScore >= 75) {
    return "keep";
  }

  if (bestScore >= 55) {
    return "situational";
  }

  return "replace";
}

export function scorePal(pal: OwnedPal): PalScore {
  const base = calculateBaseScore(pal);
  const combat = calculateCombatScore(pal);
  const breeding = calculateBreedingScore(pal);

  const bestScore = Math.max(
    base,
    combat,
    breeding,
  );

  return {
    base,
    combat,
    breeding,

    baseGrade: grade(base),
    combatGrade: grade(combat),
    breedingGrade: grade(breeding),

    bestRole: determineBestRole(
      base,
      combat,
      breeding,
    ),

    verdict: determineVerdict(bestScore),
  };
}