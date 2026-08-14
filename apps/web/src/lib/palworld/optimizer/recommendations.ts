import type {
  BaseStrategy,
  CandidateScore,
  CapacityState,
  OwnedPal,
  RecommendationStatus,
  WorkCoverage,
  WorkProfile,
  WorkRecommendation,
} from "./types";

import {
  formatRoleRelevance,
  getBaseRoleWeight,
} from "./base-strategy";

import {
  calculateWorkProfile,
} from "./worker-score";

// ============================================================
// RECOMMENDATION ENGINE
// ============================================================

export function buildRecommendations(
  workCoverage: WorkCoverage[],
  palboxPals: OwnedPal[],
  baseStrategy: BaseStrategy,
  capacityState: CapacityState,
): WorkRecommendation[] {
  return workCoverage
    .map(
      (
        coverage,
      ): WorkRecommendation => {
        const currentBest =
          coverage.bestWorker;

        const roleWeight =
          getBaseRoleWeight(
            baseStrategy.role,
            coverage.name,
          );

        // IMPORTANT:
        // Score the current worker with the same
        // base-role weighting as the candidate.
        const currentProfile =
          currentBest
            ? calculateWorkProfile(
                currentBest,
                coverage.name,
                roleWeight,
              )
            : null;

        const candidates =
          palboxPals
            .map(
              (
                pal,
              ) =>
                scoreCandidate(
                  pal,
                  coverage.name,
                  roleWeight,
                ),
            )
            .filter(
              (
                candidate,
              ): candidate is CandidateScore =>
                candidate !== null,
            )
            .sort(
              compareCandidateScores,
            );

        const bestCandidate =
          candidates[0] ??
          null;

        // ======================================================
        // NO CURRENT WORKER FOR THIS ROLE
        // ======================================================

        if (
          !currentBest ||
          !currentProfile
        ) {
          return {
            work:
              coverage.name,

            currentBest:
              null,

            currentProfile:
              null,

            candidate:
              bestCandidate?.pal ??
              null,

            candidateProfile:
              bestCandidate?.profile ??
              null,

            improvement:
              bestCandidate?.profile
                .workerScore ??
              0,

            status:
              bestCandidate &&
              capacityState.hasOpenCapacity
                ? "add"
                : bestCandidate
                  ? "upgrade"
                  : "optimal",

            reason:
              bestCandidate
                ? capacityState.hasOpenCapacity
                  ? `${getPalName(
                      bestCandidate.pal,
                    )} is the strongest Palbox candidate Rebel found for ${coverage.name}, and this base still has ${capacityState.freeSlots} free worker slot${capacityState.freeSlots === 1 ? "" : "s"}.`
                  : `${getPalName(
                      bestCandidate.pal,
                    )} is the strongest Palbox candidate Rebel found for ${coverage.name}.`
                : `No compatible Palbox candidate was found for ${coverage.name}.`,

            notes:
              bestCandidate &&
              capacityState.hasOpenCapacity
                ? [
                    "Capacity-aware action: ADD, not replace.",
                  ]
                : [],
          };
        }

        // ======================================================
        // NO PALBOX CANDIDATE
        // ======================================================

        if (!bestCandidate) {
          return {
            work:
              coverage.name,

            currentBest,

            currentProfile,

            candidate:
              null,

            candidateProfile:
              null,

            improvement:
              0,

            status:
              "optimal",

            reason:
              `No compatible Palbox candidate was found for ${coverage.name}.`,

            notes:
              [
                `Base relevance: ${formatRoleRelevance(
                  roleWeight,
                )}.`,

                ...buildProfileNotes(
                  currentBest,
                  currentProfile,
                  coverage.name,
                ),
              ].slice(
                0,
                4,
              ),
          };
        }

        // ======================================================
        // CANDIDATE COMPARISON
        // ======================================================

        const candidate =
          bestCandidate.pal;

        const candidateProfile =
          bestCandidate.profile;

        const improvement =
          candidateProfile.workerScore -
          currentProfile.workerScore;

        const currentLevel =
          currentBest.level ??
          1;

        const candidateLevel =
          candidate.level ??
          1;

        const levelGap =
          currentLevel -
          candidateLevel;

        const candidateHasHigherSuitability =
          candidateProfile.effectiveWorkLevel >
          currentProfile.effectiveWorkLevel;

        const candidateHasEqualSuitability =
          candidateProfile.effectiveWorkLevel ===
          currentProfile.effectiveWorkLevel;

        const majorDevelopmentGap =
          (
            candidateLevel <=
              10 &&
            currentLevel >=
              25
          ) ||
          levelGap >=
            30;

        const meaningfulWorkerGain =
          improvement >=
          18;

        const clearSuitabilityGain =
          candidateProfile.effectiveWorkLevel >=
          currentProfile.effectiveWorkLevel +
            1;

        const notes =
          [
            `Base relevance: ${formatRoleRelevance(
              roleWeight,
            )}.`,

            ...buildComparisonNotes(
              currentBest,
              currentProfile,
              candidate,
              candidateProfile,
              coverage.name,
            ),
          ].slice(
            0,
            4,
          );

        // ======================================================
        // DEVELOP FIRST
        // ======================================================

        if (
          candidateHasHigherSuitability &&
          clearSuitabilityGain &&
          majorDevelopmentGap
        ) {
          return {
            work:
              coverage.name,

            currentBest,

            currentProfile,

            candidate,

            candidateProfile,

            improvement,

            status:
              "develop",

            reason:
              `${getPalName(
                candidate,
              )} has much stronger ${coverage.name} potential, but the Pal is Lv.${candidateLevel} versus Lv.${currentLevel} on ${getPalName(
                currentBest,
              )}. Develop this candidate before treating it as an immediate base upgrade.`,

            notes,
          };
        }

        // ======================================================
        // OPEN CAPACITY -> ADD FIRST
        // ======================================================

        if (
          capacityState.hasOpenCapacity &&
          candidateHasHigherSuitability &&
          meaningfulWorkerGain
        ) {
          return {
            work:
              coverage.name,

            currentBest,

            currentProfile,

            candidate,

            candidateProfile,

            improvement,

            status:
              "add",

            reason:
              `${getPalName(
                candidate,
              )} is stronger for ${coverage.name}, and this base still has ${capacityState.freeSlots} free worker slot${capacityState.freeSlots === 1 ? "" : "s"}. Add the candidate first instead of removing ${getPalName(
                currentBest,
              )}.`,

            notes:
              [
                "Capacity-aware action: ADD, not replace.",

                ...notes,
              ].slice(
                0,
                4,
              ),
          };
        }

        // ======================================================
        // BASE FULL -> TRUE REPLACEMENT
        // ======================================================

        if (
          candidateHasHigherSuitability &&
          meaningfulWorkerGain
        ) {
          return {
            work:
              coverage.name,

            currentBest,

            currentProfile,

            candidate,

            candidateProfile,

            improvement,

            status:
              "upgrade",

            reason:
              `${getPalName(
                candidate,
              )} is a stronger immediate ${coverage.name} fit for this ${baseStrategy.label.toLowerCase()}: effective suitability Lv.${candidateProfile.effectiveWorkLevel} versus Lv.${currentProfile.effectiveWorkLevel}. The base has no free capacity, so this becomes a replacement decision.`,

            notes,
          };
        }

        // ======================================================
        // SAME SUITABILITY, BETTER WORK TRAITS
        // ======================================================

        if (
          candidateHasEqualSuitability &&
          improvement >=
            12
        ) {
          return {
            work:
              coverage.name,

            currentBest,

            currentProfile,

            candidate,

            candidateProfile,

            improvement,

            status:
              "alternative",

            reason:
              `${getPalName(
                candidate,
              )} matches the current ${coverage.name} suitability but has a stronger work-relevant profile for this base.`,

            notes,
          };
        }

        // ======================================================
        // KEEP CURRENT SETUP
        // ======================================================

        return {
          work:
            coverage.name,

          currentBest,

          currentProfile,

          candidate,

          candidateProfile,

          improvement,

          status:
            "optimal",

          reason:
            `No Pal currently in the Palbox clearly beats ${getPalName(
              currentBest,
            )} for ${coverage.name} once worker quality, development and base relevance are considered.`,

          notes,
        };
      },
    )
    .sort(
      (
        a,
        b,
      ) => {
        const order: Record<
          RecommendationStatus,
          number
        > = {
          add:
            0,

          upgrade:
            1,

          develop:
            2,

          alternative:
            3,

          optimal:
            4,
        };

        const statusDifference =
          order[
            a.status
          ] -
          order[
            b.status
          ];

        if (
          statusDifference !==
          0
        ) {
          return statusDifference;
        }

        const aWeight =
          getBaseRoleWeight(
            baseStrategy.role,
            a.work,
          );

        const bWeight =
          getBaseRoleWeight(
            baseStrategy.role,
            b.work,
          );

        if (
          bWeight !==
          aWeight
        ) {
          return (
            bWeight -
            aWeight
          );
        }

        if (
          b.improvement !==
          a.improvement
        ) {
          return (
            b.improvement -
            a.improvement
          );
        }

        return a.work.localeCompare(
          b.work,
        );
      },
    );
}

// ============================================================
// CANDIDATE SCORING
// ============================================================

function scoreCandidate(
  pal: OwnedPal,
  work: string,
  roleWeight: number,
): CandidateScore | null {
  const profile =
    calculateWorkProfile(
      pal,
      work,
      roleWeight,
    );

  if (
    profile.baseWorkLevel <=
      0 ||
    profile.disabledForRole
  ) {
    return null;
  }

  return {
    pal,

    profile,
  };
}

// ============================================================
// CANDIDATE SORTING
// ============================================================

function compareCandidateScores(
  a: CandidateScore,
  b: CandidateScore,
) {
  if (
    b.profile.effectiveWorkLevel !==
    a.profile.effectiveWorkLevel
  ) {
    return (
      b.profile.effectiveWorkLevel -
      a.profile.effectiveWorkLevel
    );
  }

  if (
    b.profile.workerScore !==
    a.profile.workerScore
  ) {
    return (
      b.profile.workerScore -
      a.profile.workerScore
    );
  }

  return getPalName(
    a.pal,
  ).localeCompare(
    getPalName(
      b.pal,
    ),
  );
}

// ============================================================
// CURRENT PROFILE NOTES
// ============================================================

function buildProfileNotes(
  pal: OwnedPal,
  profile: WorkProfile,
  work: string,
) {
  const notes: string[] =
    [];

  if (
    profile.jobRankBonus >
    0
  ) {
    notes.push(
      `${getPalName(
        pal,
      )} has a direct +${profile.jobRankBonus} ${work} suitability passive.`,
    );
  }

  for (
    const effect
    of profile.relevantPassives
  ) {
    if (
      effect.category ===
      "job-rank"
    ) {
      continue;
    }

    notes.push(
      `${effect.passive.name}: ${effect.summary}.`,
    );
  }

  if (
    profile.roleCount >
    3
  ) {
    notes.push(
      `${getPalName(
        pal,
      )} can perform ${profile.roleCount} enabled jobs, so Rebel applies a small role-focus penalty.`,
    );
  }

  if (
    notes.length ===
    0
  ) {
    notes.push(
      `No work-specific passive advantage detected for ${work}.`,
    );
  }

  return notes.slice(
    0,
    4,
  );
}

// ============================================================
// COMPARISON NOTES
// ============================================================

function buildComparisonNotes(
  currentPal: OwnedPal,
  currentProfile: WorkProfile,
  candidatePal: OwnedPal,
  candidateProfile: WorkProfile,
  work: string,
) {
  const notes: string[] =
    [];

  if (
    candidateProfile.effectiveWorkLevel >
    currentProfile.effectiveWorkLevel
  ) {
    notes.push(
      `${getPalName(
        candidatePal,
      )}: effective ${work} Lv.${candidateProfile.effectiveWorkLevel} vs Lv.${currentProfile.effectiveWorkLevel}.`,
    );
  }

  if (
    candidateProfile.passiveScore >
    currentProfile.passiveScore
  ) {
    notes.push(
      `Candidate work-trait score ${candidateProfile.passiveScore} vs ${currentProfile.passiveScore}.`,
    );
  } else if (
    candidateProfile.passiveScore <
    currentProfile.passiveScore
  ) {
    notes.push(
      `${getPalName(
        currentPal,
      )} has the stronger work-trait profile (${currentProfile.passiveScore} vs ${candidateProfile.passiveScore}).`,
    );
  }

  const currentLevel =
    currentPal.level ??
    1;

  const candidateLevel =
    candidatePal.level ??
    1;

  if (
    currentLevel -
      candidateLevel >=
    20
  ) {
    notes.push(
      `Development gap: candidate Lv.${candidateLevel}, current worker Lv.${currentLevel}.`,
    );
  }

  const candidateRelevant =
    candidateProfile
      .relevantPassives
      .filter(
        (
          effect,
        ) =>
          effect.score !==
            0 ||
          effect.category ===
            "job-rank",
      )
      .map(
        (
          effect,
        ) =>
          `${effect.passive.name} (${effect.summary})`,
      );

  if (
    candidateRelevant.length >
    0
  ) {
    notes.push(
      `Candidate work traits: ${candidateRelevant.slice(
        0,
        2,
      ).join(
        ", ",
      )}.`,
    );
  }

  return notes.slice(
    0,
    4,
  );
}

// ============================================================
// PAL NAME
// ============================================================

function getPalName(
  pal: OwnedPal,
) {
  return (
    pal.nickname ??
    pal.species
  );
}