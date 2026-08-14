export type PalPassive = {
  internalId: string;
  name: string;
  description: string | null;
  rank: number;
};

export type OwnedPal = {
  id: string | null;

  species: string;
  internalSpeciesId: string;
  nickname: string | null;

  level: number | null;
  gender: string | null;
  isAlpha: boolean;

  elements: string[];

  ivs: {
    hp: number | null;
    attack: number | null;
    defense: number | null;
  };

  passives: PalPassive[];

  workSuitability: Record<string, number>;

  combatStats: {
    hp: number | null;
    attack: number | null;
    defense: number | null;

    hpPercentile: number | null;
    attackPercentile: number | null;
    defensePercentile: number | null;
    combatPercentile: number | null;

    speciesTier: string | null;
    food: number | null;
  } | null;

  slot: {
    containerId: string | null;
    slotIndex: number | null;
  } | null;

  location: {
    type: string;

    containerId: string | null;
    capacity: number | null;

    baseId: string | null;
    baseIndex: number | null;

    coordinates: {
      x: number;
      y: number;
      z: number;
    } | null;

    slotIndex: number | null;
    displaySlot: number | null;
  } | null;

  disabledWorkSuitabilities?: string[];
};

export type PassiveCategory =
  | "work-speed"
  | "san"
  | "movement"
  | "nocturnal"
  | "job-rank"
  | "negative-work"
  | "neutral";

export type PassiveEffect = {
  passive: PalPassive;

  category: PassiveCategory;

  score: number;

  relevant: boolean;

  summary: string;
};

export type WorkProfile = {
  work: string;

  baseWorkLevel: number;

  jobRankBonus: number;

  effectiveWorkLevel: number;

  passiveScore: number;

  focusPenalty: number;

  workerScore: number;

  relevantPassives: PassiveEffect[];

  ignoredPassives: PassiveEffect[];

  roleCount: number;

  disabledForRole: boolean;
};

export type WorkCoverage = {
  name: string;

  workers: number;

  highestLevel: number;

  totalLevel: number;

  bestWorker: OwnedPal | null;

  bestProfile: WorkProfile | null;
};

export type CandidateScore = {
  pal: OwnedPal;

  profile: WorkProfile;
};

export type BaseRole =
  | "general"
  | "production"
  | "resource"
  | "farming"
  | "breeding";

export type BaseRoleConfidence =
  | "low"
  | "medium"
  | "high";

export type BaseWorkPriority = {
  work: string;

  score: number;

  workers: number;

  highestLevel: number;
};

export type BaseStrategy = {
  role: BaseRole;

  label: string;

  confidence: BaseRoleConfidence;

  priorityWork: BaseWorkPriority[];

  supportingWork: BaseWorkPriority[];

  lowPriorityWork: BaseWorkPriority[];

  reason: string;
};

export type RecommendationStatus =
  | "add"
  | "upgrade"
  | "develop"
  | "alternative"
  | "optimal";

export type WorkRecommendation = {
  work: string;

  currentBest: OwnedPal | null;

  currentProfile: WorkProfile | null;

  candidate: OwnedPal | null;

  candidateProfile: WorkProfile | null;

  improvement: number;

  status: RecommendationStatus;

  reason: string;

  notes: string[];
};

export type CapacityState = {
  assigned: number;

  capacity: number;

  freeSlots: number;

  utilisationPercent: number;

  hasOpenCapacity: boolean;
};

export type WorldPreferencesFile = {
  worlds?: Record<
    string,
    {
      baseNames?: Record<string, string>;
      updatedAt?: string;
    }
  >;
};

export type SelectedWorld = {
  steamAccountId?: string;
  worldId?: string;
  worldPath?: string;
  levelSavPath?: string;
  selectedAt?: string;
};