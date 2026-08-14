export type PalGrade = "S" | "A" | "B" | "C" | "D";

export type PalRole =
  | "base"
  | "combat"
  | "breeding"
  | "general";

export type WorkSuitability =
  | "kindling"
  | "watering"
  | "planting"
  | "electricity"
  | "handiwork"
  | "gathering"
  | "lumbering"
  | "mining"
  | "medicine"
  | "cooling"
  | "transporting"
  | "farming";

export type PalWorkSkill = {
  type: WorkSuitability;
  level: number;
};

export type PalPassive = {
  name: string;

  /**
   * Positive values help the Pal.
   * Negative values hurt the Pal.
   *
   * We'll calculate these automatically later.
   */
  baseScore: number;
  combatScore: number;
  breedingScore: number;
};

export type OwnedPal = {
  id: string;

  species: string;
  nickname?: string;

  level: number;

  workSuitabilities: PalWorkSkill[];
  passives: PalPassive[];

  stats?: {
    hp?: number;
    attack?: number;
    defense?: number;
  };

  ivs?: {
    hp?: number;
    attack?: number;
    defense?: number;
  };
};

export type PalScore = {
  base: number;
  combat: number;
  breeding: number;

  baseGrade: PalGrade;
  combatGrade: PalGrade;
  breedingGrade: PalGrade;

  bestRole: PalRole;

  verdict:
    | "excellent"
    | "keep"
    | "situational"
    | "replace";
};