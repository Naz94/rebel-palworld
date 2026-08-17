import activeSkillData from "./active-skill-intelligence.json";

type RawActiveSkill = {
  name: string;
  description: string;
  element: string;
  type: string;
  power: number;
  cooldown: number;
  minRange: number;
  maxRange: number;
  effects: {
    type: string;
    value: number;
    value_ex: number;
  }[];
};

export type ActiveSkillIntelligence = RawActiveSkill & {
  internalId: string;
  normalizedElement: string;
  sameElementBonus: boolean;
  burstScore: number;
  cycleScore: number;
  qualityScore: number;
};

const skills =
  activeSkillData.skills as Record<string, RawActiveSkill>;

const clamp = (value: number) =>
  Math.max(0, Math.min(100, value));

export function normalizeSkillElement(element: string): string {
  const aliases: Record<string, string> = {
    Normal: "Neutral",
    Leaf: "Grass",
    Earth: "Ground",
    Electricity: "Electric",
  };

  return aliases[element] ?? element;
}

function rawSkillScore(skill: RawActiveSkill): number {
  const cooldown = Math.max(1, skill.cooldown);
  const cyclePower = skill.power / cooldown;
  const statusValue = skill.effects.length > 0 ? 18 : 0;

  return skill.power * 0.58 + cyclePower * 7 + statusValue;
}

const rankedRawScores = Object.values(skills)
  .map(rawSkillScore)
  .filter((score) => score > 0)
  .sort((a, b) => a - b);

function percentile(value: number): number {
  if (rankedRawScores.length === 0 || value <= 0) return 0;

  let belowOrEqual = 0;
  for (const score of rankedRawScores) {
    if (score <= value) belowOrEqual += 1;
    else break;
  }

  return clamp((belowOrEqual / rankedRawScores.length) * 100);
}

export function getActiveSkillIntelligence(
  internalId: string,
  palElements: string[],
): ActiveSkillIntelligence | null {
  const cleanId = internalId.replace(/^EPalWazaID::/, "");
  const skill = skills[cleanId];

  if (!skill) return null;

  const normalizedElement =
    normalizeSkillElement(skill.element);
  const sameElementBonus = palElements.some(
    (element) =>
      element.toLowerCase() === normalizedElement.toLowerCase(),
  );

  const cooldown = Math.max(1, skill.cooldown);
  const burstScore = percentile(skill.power);
  const cycleScore = percentile(skill.power / cooldown);
  const baseQuality = percentile(rawSkillScore(skill));

  return {
    ...skill,
    internalId: cleanId,
    normalizedElement,
    sameElementBonus,
    burstScore,
    cycleScore,
    qualityScore: clamp(
      baseQuality +
        (sameElementBonus ? 7 : 0) +
        (skill.effects.length > 0 ? 3 : 0),
    ),
  };
}

export function getLoadoutIntelligence(
  equippedSkillIds: string[],
  palElements: string[],
) {
  const resolved = equippedSkillIds
    .map((id) => getActiveSkillIntelligence(id, palElements))
    .filter(
      (skill): skill is ActiveSkillIntelligence =>
        skill !== null,
    );

  const unknown = equippedSkillIds.filter(
    (id) => getActiveSkillIntelligence(id, palElements) === null,
  );

  const quality =
    resolved.length > 0
      ? resolved.reduce(
          (sum, skill) => sum + skill.qualityScore,
          0,
        ) / resolved.length
      : 0;

  return {
    skills: resolved,
    unknown,
    quality: clamp(quality),
    completeness: clamp(
      (resolved.length / 3) * 100,
    ),
  };
}
