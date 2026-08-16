import fs from "node:fs";

const base =
  "C:\\Users\\nazva\\rebel-palworld\\tools\\pal-save-import";

const inputPath =
  `${base}\\normalized-pals.json`;

const levelPath =
  `${base}\\level.json`;

const outputPath =
  "C:\\Users\\nazva\\rebel-palworld\\apps\\web\\src\\lib\\palworld\\owned-pals.generated.json";

function readJson(path) {
  return JSON.parse(
    fs.readFileSync(
      path,
      "utf8",
    ),
  );
}

function getWorldSaveData(
  level,
) {
  return (
    level?.properties
      ?.worldSaveData
      ?.value ?? null
  );
}

function getCharacterContainers(
  world,
) {
  const raw =
    world
      ?.CharacterContainerSaveData
      ?.value;

  if (
    !Array.isArray(
      raw,
    )
  ) {
    return [];
  }

  return raw
    .map(
      (entry) => {
        const containerId =
          entry?.key?.ID
            ?.value ?? null;

        const capacity =
          entry?.value
            ?.SlotNum
            ?.value ?? null;

        const reference =
          entry?.value
            ?.bReferenceSlot
            ?.value ?? false;

        return {
          containerId,
          capacity,
          reference,
        };
      },
    )
    .filter(
      (entry) =>
        typeof entry.containerId ===
        "string",
    );
}

function getBaseContainers(
  world,
) {
  const raw =
    world
      ?.BaseCampSaveData
      ?.value;

  if (
    !Array.isArray(
      raw,
    )
  ) {
    return [];
  }

  return raw
    .map(
      (
        entry,
        index,
      ) => {
        const rawData =
          entry?.value
            ?.WorkerDirector
            ?.value
            ?.RawData
            ?.value;

        const baseId =
          entry?.key ?? null;

        const containerId =
          rawData
            ?.container_id ??
          null;

        const translation =
          rawData
            ?.spawn_transform
            ?.translation ??
          null;

        return {
          baseId,
          containerId,

          baseIndex:
            index + 1,

          coordinates:
            translation
              ? {
                  x:
                    translation.x ??
                    null,

                  y:
                    translation.y ??
                    null,

                  z:
                    translation.z ??
                    null,
                }
              : null,
        };
      },
    )
    .filter(
      (entry) =>
        typeof entry.containerId ===
        "string",
    );
}

function buildContainerMap(
  world,
) {
  const containers =
    getCharacterContainers(
      world,
    );

  const bases =
    getBaseContainers(
      world,
    );

  const baseByContainer =
    new Map(
      bases.map(
        (base) => [
          base.containerId,
          base,
        ],
      ),
    );

  const nonBaseContainers =
    containers.filter(
      (container) =>
        !baseByContainer.has(
          container.containerId,
        ),
    );

  const partyCandidate =
    [...nonBaseContainers]
      .filter(
        (container) =>
          typeof container.capacity ===
            "number" &&
          container.capacity <= 5,
      )
      .sort(
        (a, b) =>
          a.capacity -
          b.capacity,
      )[0] ?? null;

  const palboxCandidate =
    [...nonBaseContainers]
      .filter(
        (container) =>
          container.containerId !==
            partyCandidate
              ?.containerId &&
          typeof container.capacity ===
            "number" &&
          container.capacity >= 100,
      )
      .sort(
        (a, b) =>
          b.capacity -
          a.capacity,
      )[0] ?? null;

  const map =
    new Map();

  for (
    const container
    of containers
  ) {
    const base =
      baseByContainer.get(
        container.containerId,
      );

    if (
      base
    ) {
      map.set(
        container.containerId,
        {
          type:
            "BASE",

          containerId:
            container.containerId,

          capacity:
            container.capacity,

          baseId:
            base.baseId,

          baseIndex:
            base.baseIndex,

          coordinates:
            base.coordinates,
        },
      );

      continue;
    }

    if (
      partyCandidate &&
      container.containerId ===
        partyCandidate.containerId
    ) {
      map.set(
        container.containerId,
        {
          type:
            "PARTY",

          containerId:
            container.containerId,

          capacity:
            container.capacity,

          baseId:
            null,

          baseIndex:
            null,

          coordinates:
            null,
        },
      );

      continue;
    }

    if (
      palboxCandidate &&
      container.containerId ===
        palboxCandidate.containerId
    ) {
      map.set(
        container.containerId,
        {
          type:
            "PALBOX",

          containerId:
            container.containerId,

          capacity:
            container.capacity,

          baseId:
            null,

          baseIndex:
            null,

          coordinates:
            null,
        },
      );

      continue;
    }

    map.set(
      container.containerId,
      {
        type:
          "OTHER",

        containerId:
          container.containerId,

        capacity:
          container.capacity,

        baseId:
          null,

        baseIndex:
          null,

        coordinates:
          null,
      },
    );
  }

  return {
    map,
    containers,
    bases,
    partyCandidate,
    palboxCandidate,
  };
}

function resolveLocation(
  pal,
  containerMap,
) {
  const containerId =
    pal?.slot
      ?.containerId ??
    null;

  const slotIndex =
    pal?.slot
      ?.slotIndex ??
    null;

  if (
    !containerId
  ) {
    return {
      type:
        "UNKNOWN",

      containerId:
        null,

      capacity:
        null,

      slotIndex,

      displaySlot:
        typeof slotIndex ===
        "number"
          ? slotIndex + 1
          : null,

      baseId:
        null,

      baseIndex:
        null,

      coordinates:
        null,
    };
  }

  const container =
    containerMap.get(
      containerId,
    );

  if (
    !container
  ) {
    return {
      type:
        "UNKNOWN",

      containerId,

      capacity:
        null,

      slotIndex,

      displaySlot:
        typeof slotIndex ===
        "number"
          ? slotIndex + 1
          : null,

      baseId:
        null,

      baseIndex:
        null,

      coordinates:
        null,
    };
  }

  return {
    ...container,

    slotIndex,

    displaySlot:
      typeof slotIndex ===
      "number"
        ? slotIndex + 1
        : null,
  };
}

const pals =
  readJson(
    inputPath,
  );

const level =
  readJson(
    levelPath,
  );

const world =
  getWorldSaveData(
    level,
  );

if (
  !world
) {
  throw new Error(
    "Could not find worldSaveData in level.json.",
  );
}

const {
  map:
    containerMap,

  containers,
  bases,
  partyCandidate,
  palboxCandidate,
} =
  buildContainerMap(
    world,
  );

const appPals =
  pals.map(
    (pal) => {
      const location =
        resolveLocation(
          pal,
          containerMap,
        );

      return {
        id:
          pal.instanceId,

        entityType:
          pal.entityType ??
          "PAL",

        dataQuality:
          pal.dataQuality ??
          null,

        referenceIdentity:
          pal.referenceIdentity ??
          null,

        species:
          pal.displayName,

        internalSpeciesId:
          pal.internalSpeciesId,

        nickname:
          pal.nickname,

        level:
          pal.level,

        gender:
          pal.gender,

        isAlpha:
          pal.isAlpha,

        elements:
          pal.elements ??
          [],

        partnerSkill:
          pal.partnerSkill ??
          null,

        speciesUtility:
          pal.speciesUtility ??
          null,

        ivs:
          pal.ivs,

        passives:
          pal.passives ??
          [],

        skills: {
          equipped:
            pal.skills
              ?.equipped ??
            [],

          learned:
            pal.skills
              ?.learned ??
            [],
        },

        progression: {
          condensation: {
            rank:
              pal.progression
                ?.condensation
                ?.rank ??
              1,

            stars:
              pal.progression
                ?.condensation
                ?.stars ??
              0,

            rankUpExp:
              pal.progression
                ?.condensation
                ?.rankUpExp ??
              0,
          },

          souls: {
            hp:
              pal.progression
                ?.souls
                ?.hp ??
              0,

            attack:
              pal.progression
                ?.souls
                ?.attack ??
              0,

            defense:
              pal.progression
                ?.souls
                ?.defense ??
              0,

            workSpeed:
              pal.progression
                ?.souls
                ?.workSpeed ??
              0,
          },

          workSuitabilityUpgrades:
            pal.progression
              ?.workSuitabilityUpgrades ??
            [],

          friendship: {
            points:
              pal.progression
                ?.friendship
                ?.points ??
              0,

            activePartySeconds:
              pal.progression
                ?.friendship
                ?.activePartySeconds ??
              0,

            partySeconds:
              pal.progression
                ?.friendship
                ?.partySeconds ??
              0,

            baseSeconds:
              pal.progression
                ?.friendship
                ?.baseSeconds ??
              0,
          },
        },

        currentState: {
          workSuitability:
            pal.currentState
              ?.workSuitability ??
            null,

          fullStomach:
            pal.currentState
              ?.fullStomach ??
            null,

          sanity:
            pal.currentState
              ?.sanity ??
            null,
        },

        workSuitability:
          pal.workSuitability ??
          {},

        ranchDrops:
          pal.ranchDrops ??
          [],

        combatStats:
          pal.combatStats ??
          null,

        slot: {
          containerId:
            pal.slot
              ?.containerId ??
            null,

          slotIndex:
            pal.slot
              ?.slotIndex ??
            null,
        },

        location,

        disabledWorkSuitabilities:
          pal.disabledWorkSuitabilities ??
          [],

        isRarePal:
          pal.isRarePal ??
          false,
      };
    },
  );

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    appPals,
    null,
    2,
  ),
  "utf8",
);

const palEntities =
  appPals.filter(
    (pal) =>
      pal.entityType ===
      "PAL",
  );

const humanEntities =
  appPals.filter(
    (pal) =>
      pal.entityType ===
      "HUMAN",
  );

const unknownEntities =
  appPals.filter(
    (pal) =>
      pal.entityType ===
      "UNKNOWN",
  );

console.log(
  `Built app data for ${appPals.length} owned entities.`,
);

console.log(
  `Pals: ${palEntities.length}`,
);

console.log(
  `Captured humans: ${humanEntities.length}`,
);

console.log(
  `Unknown entities: ${unknownEntities.length}`,
);

console.log(
  `Saved to: ${outputPath}`,
);

console.log(
  "\n=== APP DATA V5 ===",
);

console.log({
  totalEntities:
    appPals.length,

  pals:
    palEntities.length,

  humans:
    humanEntities.length,

  unknown:
    unknownEntities.length,

  partnerSkills:
    palEntities.filter(
      (pal) =>
        Boolean(
          pal.partnerSkill,
        ),
    ).length,

  condensed:
    palEntities.filter(
      (pal) =>
        (
          pal.progression
            ?.condensation
            ?.stars ??
          0
        ) > 0,
    ).length,

  partialCondensation:
    palEntities.filter(
      (pal) =>
        (
          pal.progression
            ?.condensation
            ?.rankUpExp ??
          0
        ) > 0,
    ).length,

  learnedSkills:
    palEntities.filter(
      (pal) =>
        (
          pal.skills
            ?.learned
            ?.length ??
          0
        ) > 0,
    ).length,

  workUpgrades:
    palEntities.filter(
      (pal) =>
        (
          pal.progression
            ?.workSuitabilityUpgrades
            ?.length ??
          0
        ) > 0,
    ).length,

  ranchPals:
    palEntities.filter(
      (pal) =>
        (
          pal.ranchDrops
            ?.length ??
          0
        ) > 0,
    ).length,

  incompleteReferences:
    palEntities.filter(
      (pal) =>
        pal.dataQuality
          ?.referenceStatus ===
        "INCOMPLETE",
    ).length,
});

console.log(
  "\nResolved character containers:",
);

for (
  const container
  of containers
) {
  const resolved =
    containerMap.get(
      container.containerId,
    );

  console.log({
    type:
      resolved?.type ??
      "UNKNOWN",

    containerId:
      container.containerId,

    capacity:
      container.capacity,

    baseId:
      resolved?.baseId ??
      null,

    baseIndex:
      resolved?.baseIndex ??
      null,
  });
}

console.log(
  "\nDetected Party:",
  partyCandidate
    ? {
        containerId:
          partyCandidate
            .containerId,

        capacity:
          partyCandidate
            .capacity,
      }
    : null,
);

console.log(
  "Detected Palbox:",
  palboxCandidate
    ? {
        containerId:
          palboxCandidate
            .containerId,

        capacity:
          palboxCandidate
            .capacity,
      }
    : null,
);

console.log(
  "Detected Bases:",
  bases.map(
    (base) => ({
      baseId:
        base.baseId,

      containerId:
        base.containerId,

      baseIndex:
        base.baseIndex,

      coordinates:
        base.coordinates,
    }),
  ),
);