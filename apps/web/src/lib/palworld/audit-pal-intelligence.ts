import {
  getPassiveTraitIntelligence,
} from "./passive-intelligence";
import type {
  RankedRealPal,
} from "./rank-pals";

export type AuditSeverity =
  | "ERROR"
  | "WARNING"
  | "REVIEW"
  | "INFO";

export type PalAuditFinding = {
  id: string;
  severity: AuditSeverity;
  code: string;
  title: string;
  detail: string;
  pal: RankedRealPal;
};

export type PalAuditReport = {
  scanned: number;
  findings: PalAuditFinding[];
  counts: Record<AuditSeverity, number>;
};

const ELEMENTS = [
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Ice",
  "Ground",
  "Dark",
  "Dragon",
  "Neutral",
];

function identity(
  entry: RankedRealPal,
): string {
  return (
    entry.pal.id ??
    [
      entry.pal.internalSpeciesId,
      entry.pal.location.containerId,
      entry.pal.location.slotIndex,
    ].join(":")
  );
}

function add(
  findings: PalAuditFinding[],
  pal: RankedRealPal,
  severity: AuditSeverity,
  code: string,
  title: string,
  detail: string,
): void {
  findings.push({
    id:
      identity(pal) +
      ":" +
      code +
      ":" +
      findings.length,
    severity,
    code,
    title,
    detail,
    pal,
  });
}

function getSoulTotal(
  entry: RankedRealPal,
): number {
  const souls =
    entry.pal.progression?.souls;

  return souls
    ? souls.hp +
        souls.attack +
        souls.defense
    : 0;
}

function hasDocumentedScaling(
  entry: RankedRealPal,
): boolean {
  const description =
    entry.pal.partnerSkill?.description ?? "";

  return (
    /\([^)]*\d+(?:\.\d+)?\s*[~–-]\s*\d+(?:\.\d+)?[^)]*\)/.test(
      description,
    ) ||
    /\+\(\d+(?:\.\d+)?\s*[~–-]\s*\d+(?:\.\d+)?\)%/.test(
      description,
    )
  );
}

export function auditPalCollection(
  pals: RankedRealPal[],
): PalAuditReport {
  const findings: PalAuditFinding[] = [];

  for (const entry of pals) {
    const { pal, score } = entry;
    const combat =
      score.combatIntelligenceV2;

    if (
      pal.dataQuality?.referenceStatus ===
        "INCOMPLETE" ||
      (pal.dataQuality?.issues.length ?? 0) >
        0
    ) {
      add(
        findings,
        entry,
        "ERROR",
        "REFERENCE_INCOMPLETE",
        "Incomplete reference data",
        pal.dataQuality?.issues.join(" · ") ||
          "Reference data is incomplete.",
      );
    }

    if (combat.unknownSkillIds.length > 0) {
      add(
        findings,
        entry,
        "ERROR",
        "UNKNOWN_ACTIVE_SKILL",
        "Equipped move could not be resolved",
        combat.unknownSkillIds.join(" · "),
      );
    }

    if (
      pal.partnerSkill &&
      !pal.partnerSkill.description?.trim()
    ) {
      add(
        findings,
        entry,
        "ERROR",
        "PARTNER_DESCRIPTION_MISSING",
        "Partner Skill description is missing",
        pal.partnerSkill.name ??
          "Unknown Partner Skill",
      );
    }

    for (const passive of pal.passives) {
      const intelligence =
        getPassiveTraitIntelligence(passive);

      if (
        intelligence.description.startsWith(
          "No effect description",
        )
      ) {
        add(
          findings,
          entry,
          "ERROR",
          "PASSIVE_DESCRIPTION_MISSING",
          "Passive description is missing",
          passive.name,
        );
      }

      const element =
        ELEMENTS.find((candidate) =>
          new RegExp(
            candidate + " attack",
            "i",
          ).test(intelligence.description),
        );

      if (
        element &&
        !pal.elements.some(
          (ownedElement) =>
            ownedElement.toLowerCase() ===
            element.toLowerCase(),
        )
      ) {
        add(
          findings,
          entry,
          "INFO",
          "PASSIVE_ELEMENT_MISMATCH",
          "Elemental passive does not match this Pal",
          `${passive.name} boosts ${element}, while this copy is ${pal.elements.join(
            " / ",
          )}. Treat it mainly as a breeding option.`,
        );
      }
    }

    if (
      score.investmentPlan.actions.level &&
      (pal.level ?? 0) >= 70
    ) {
      add(
        findings,
        entry,
        "WARNING",
        "LEVEL_RECOMMENDATION_HIGH_LEVEL",
        "High-level Pal still recommends levelling",
        `Level ${pal.level}; verify the remaining gain is meaningful.`,
      );
    }

    if (
      score.investmentPlan.actions.ivFruit &&
      [pal.ivs.hp, pal.ivs.attack, pal.ivs.defense].every(
        (value) =>
          typeof value === "number" &&
          value >= 90,
      )
    ) {
      add(
        findings,
        entry,
        "ERROR",
        "IV_FRUIT_WITHOUT_NEED",
        "IV Fruit recommended without a sub-90 combat IV",
        "The IV investment action contradicts the recorded IVs.",
      );
    }

    if (
      score.investmentPlan.actions.souls &&
      getSoulTotal(entry) >= 60
    ) {
      add(
        findings,
        entry,
        "ERROR",
        "SOULS_ALREADY_MAXED",
        "Combat Souls recommended after the tracked cap",
        "All tracked Soul investment is already present.",
      );
    }

    if (
      score.investmentPlan.actions.condense &&
      !hasDocumentedScaling(entry)
    ) {
      add(
        findings,
        entry,
        "WARNING",
        "CONDENSE_WITHOUT_SCALING",
        "Condensation recommended without documented scaling",
        pal.partnerSkill?.name ??
          "No Partner Skill",
      );
    }

    const strategicBreeding =
      score.breedingReasons.some(
        (reason) =>
          /exceptional .* iv donor/i.test(reason) ||
          /best .* breeder/i.test(reason) ||
          /only .* breeding option/i.test(reason),
      );

    if (
      strategicBreeding &&
      !score.investmentPlan.actions.breed
    ) {
      add(
        findings,
        entry,
        "ERROR",
        "BREEDING_CONTRADICTION",
        "Protected breeder says breed: NO",
        score.breedingReasons
          .filter((reason) =>
            /exceptional|best .* breeder|only .* breeding/i.test(
              reason,
            ),
          )
          .join(" · "),
      );
    }

    if (
      combat.archetype ===
        "Low Combat Potential" &&
      score.bestRole === "Combat"
    ) {
      add(
        findings,
        entry,
        "ERROR",
        "LOW_COMBAT_PRIMARY_ROLE",
        "Low-combat Pal is assigned Combat as its primary role",
        `Combat ceiling ${combat.generalCeiling.toFixed(
          0,
        )}.`,
      );
    }

    const sharedMatchups =
      combat.strongAgainst.filter(
        (element) =>
          combat.weakAgainst.includes(element),
      );

    if (sharedMatchups.length > 0) {
      add(
        findings,
        entry,
        "INFO",
        "TWO_WAY_MATCHUP",
        "Dual-element two-way matchup",
        `${sharedMatchups.join(
          " · ",
        )} is both an offensive advantage and a defensive threat.`,
      );
    }

    if (
      score.decisionBucket === "CORE_KEEP" &&
      score.speciesCopyCount >= 6 &&
      !score.bestOfSpecies.overall &&
      !score.bestOfSpecies.combat &&
      !score.bestOfSpecies.base &&
      !score.bestOfSpecies.breeding &&
      !pal.isAlpha &&
      (pal.progression?.condensation?.stars ??
        0) === 0 &&
      getSoulTotal(entry) === 0 &&
      score.protectionReasons.every(
        (reason) =>
          reason === "Valuable passive trait",
      )
    ) {
      add(
        findings,
        entry,
        "WARNING",
        "WEAK_DUPLICATE_PROTECTION",
        "Duplicate may be over-protected",
        `Copy ${score.speciesRank} of ${score.speciesCopyCount} is protected only by a generic passive rule.`,
      );
    }

    const description =
      pal.partnerSkill?.description?.toLowerCase() ??
      "";
    const genericPartner =
      pal.partnerSkill &&
      (
        description.includes("chromite") ||
        description.includes("meat cleaver") ||
        description.includes("additional jump") ||
        description.includes("attack of") &&
          description.includes("pals")
      );

    if (
      genericPartner &&
      !pal.partnerSkill?.name
    ) {
      add(
        findings,
        entry,
        "ERROR",
        "PARTNER_NAME_MISSING",
        "Recognisable Partner Skill has no name",
        description,
      );
    }
  }

  const order: Record<AuditSeverity, number> = {
    ERROR: 0,
    WARNING: 1,
    REVIEW: 2,
    INFO: 3,
  };

  findings.sort(
    (a, b) =>
      order[a.severity] -
        order[b.severity] ||
      a.pal.pal.species.localeCompare(
        b.pal.pal.species,
      ) ||
      (a.pal.score.speciesRank ?? 0) -
        (b.pal.score.speciesRank ?? 0),
  );

  return {
    scanned: pals.length,
    findings,
    counts: {
      ERROR: findings.filter(
        (finding) =>
          finding.severity === "ERROR",
      ).length,
      WARNING: findings.filter(
        (finding) =>
          finding.severity === "WARNING",
      ).length,
      REVIEW: findings.filter(
        (finding) =>
          finding.severity === "REVIEW",
      ).length,
      INFO: findings.filter(
        (finding) =>
          finding.severity === "INFO",
      ).length,
    },
  };
}
