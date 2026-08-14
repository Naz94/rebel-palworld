import type {
  CapacityState,
  OwnedPal,
  WorkRecommendation,
} from "./types";

// ============================================================
// CAPACITY STATE
// ============================================================

export function calculateCapacityState(
  workers: OwnedPal[],
  capacity: number,
): CapacityState {
  const safeCapacity =
    Math.max(
      0,
      Math.floor(
        capacity,
      ),
    );

  const assigned =
    workers.length;

  const freeSlots =
    Math.max(
      0,
      safeCapacity -
        assigned,
    );

  const utilisationPercent =
    safeCapacity > 0
      ? Math.round(
          (
            assigned /
            safeCapacity
          ) *
            100,
        )
      : 0;

  return {
    assigned,

    capacity:
      safeCapacity,

    freeSlots,

    utilisationPercent,

    hasOpenCapacity:
      freeSlots > 0,
  };
}

// ============================================================
// CAPACITY LABELS
// ============================================================

export function getCapacityStatusLabel(
  state: CapacityState,
) {
  if (
    state.capacity <=
    0
  ) {
    return "Capacity Unknown";
  }

  if (
    state.freeSlots ===
    0
  ) {
    return "Base Full";
  }

  if (
    state.utilisationPercent >=
    90
  ) {
    return "Nearly Full";
  }

  if (
    state.utilisationPercent >=
    70
  ) {
    return "Healthy Capacity";
  }

  if (
    state.utilisationPercent >=
    40
  ) {
    return "Open Capacity";
  }

  return "Lightly Staffed";
}

// ============================================================
// UNIQUE ADD CANDIDATES
// ============================================================

export function getUniqueAddCandidates(
  recommendations: WorkRecommendation[],
) {
  const seen =
    new Set<string>();

  const unique: OwnedPal[] =
    [];

  for (
    const recommendation
    of recommendations
  ) {
    if (
      recommendation.status !==
      "add"
    ) {
      continue;
    }

    const candidate =
      recommendation.candidate;

    if (!candidate) {
      continue;
    }

    const key =
      getPalIdentityKey(
        candidate,
      );

    if (
      seen.has(
        key,
      )
    ) {
      continue;
    }

    seen.add(
      key,
    );

    unique.push(
      candidate,
    );
  }

  return unique;
}

// ============================================================
// COUNT UNIQUE ADDS
// ============================================================

export function countUniqueAddCandidates(
  recommendations: WorkRecommendation[],
) {
  return getUniqueAddCandidates(
    recommendations,
  ).length;
}

// ============================================================
// CAP ADDITIONS TO AVAILABLE SLOTS
// ============================================================

export function getUsableAddCandidates(
  recommendations: WorkRecommendation[],
  capacityState: CapacityState,
) {
  if (
    !capacityState.hasOpenCapacity
  ) {
    return [];
  }

  return getUniqueAddCandidates(
    recommendations,
  ).slice(
    0,
    capacityState.freeSlots,
  );
}

// ============================================================
// CAN ADD PAL
// ============================================================

export function canAddWorker(
  capacityState: CapacityState,
) {
  return (
    capacityState.hasOpenCapacity &&
    capacityState.freeSlots >
      0
  );
}

// ============================================================
// SHOULD ADD INSTEAD OF REPLACE
// ============================================================

export function shouldAddInsteadOfReplace(
  capacityState: CapacityState,
  candidate: OwnedPal | null,
) {
  return Boolean(
    candidate &&
      canAddWorker(
        capacityState,
      ),
  );
}

// ============================================================
// CAPACITY EXPLANATION
// ============================================================

export function buildCapacityReason(
  capacityState: CapacityState,
) {
  if (
    capacityState.capacity <=
    0
  ) {
    return (
      "Rebel could not determine this base's worker capacity."
    );
  }

  if (
    capacityState.freeSlots ===
    0
  ) {
    return (
      `This base is full at ${capacityState.assigned}/${capacityState.capacity} workers. ` +
      "Future improvements require replacing or reassigning an existing worker."
    );
  }

  if (
    capacityState.freeSlots ===
    1
  ) {
    return (
      `This base has 1 free worker slot (${capacityState.assigned}/${capacityState.capacity} assigned). ` +
      "Rebel can still improve the base by adding one Pal before replacements are necessary."
    );
  }

  return (
    `This base has ${capacityState.freeSlots} free worker slots ` +
    `(${capacityState.assigned}/${capacityState.capacity} assigned). ` +
    "Rebel should prefer useful additions before removing productive workers."
  );
}

// ============================================================
// CAPACITY PRIORITY
// ============================================================

export function getCapacityPriority(
  capacityState: CapacityState,
) {
  if (
    capacityState.freeSlots ===
    0
  ) {
    return "replacement" as const;
  }

  if (
    capacityState.freeSlots <=
    2
  ) {
    return "selective-add" as const;
  }

  return "add-first" as const;
}

// ============================================================
// PAL IDENTITY
// ============================================================

function getPalIdentityKey(
  pal: OwnedPal,
) {
  if (
    pal.id
  ) {
    return pal.id;
  }

  const containerId =
    pal.location?.containerId ??
    pal.slot?.containerId ??
    "unknown-container";

  const slotIndex =
    pal.location?.slotIndex ??
    pal.slot?.slotIndex ??
    -1;

  return [
    pal.internalSpeciesId,
    containerId,
    slotIndex,
  ].join(
    ":",
  );
}