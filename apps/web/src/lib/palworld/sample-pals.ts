import type { OwnedPal } from "./types";

export const samplePals: OwnedPal[] = [
  {
    id: "anubis-001",
    species: "Anubis",
    nickname: "Anubis #1",
    level: 34,

    workSuitabilities: [
      { type: "handiwork", level: 4 },
      { type: "mining", level: 3 },
      { type: "transporting", level: 2 },
    ],

    passives: [
      {
        name: "Artisan",
        baseScore: 20,
        combatScore: 0,
        breedingScore: 10,
      },
      {
        name: "Serious",
        baseScore: 10,
        combatScore: 0,
        breedingScore: 6,
      },
      {
        name: "Work Slave",
        baseScore: 15,
        combatScore: -5,
        breedingScore: 8,
      },
    ],

    ivs: {
      hp: 72,
      attack: 61,
      defense: 68,
    },
  },

  {
    id: "anubis-002",
    species: "Anubis",
    nickname: "Anubis #2",
    level: 42,

    workSuitabilities: [
      { type: "handiwork", level: 4 },
      { type: "mining", level: 3 },
      { type: "transporting", level: 2 },
    ],

    passives: [
      {
        name: "Musclehead",
        baseScore: -5,
        combatScore: 20,
        breedingScore: 10,
      },
      {
        name: "Ferocious",
        baseScore: 0,
        combatScore: 15,
        breedingScore: 8,
      },
    ],

    ivs: {
      hp: 84,
      attack: 96,
      defense: 79,
    },
  },

  {
    id: "digtoise-001",
    species: "Digtoise",
    nickname: "Digtoise #1",
    level: 28,

    workSuitabilities: [
      { type: "mining", level: 3 },
    ],

    passives: [
      {
        name: "Artisan",
        baseScore: 20,
        combatScore: 0,
        breedingScore: 10,
      },
      {
        name: "Workaholic",
        baseScore: 10,
        combatScore: 0,
        breedingScore: 5,
      },
    ],

    ivs: {
      hp: 60,
      attack: 55,
      defense: 75,
    },
  },

  {
    id: "frostallion-001",
    species: "Frostallion",
    nickname: "Frostallion #1",
    level: 50,

    workSuitabilities: [
      { type: "cooling", level: 4 },
    ],

    passives: [
      {
        name: "Legend",
        baseScore: 0,
        combatScore: 20,
        breedingScore: 15,
      },
      {
        name: "Musclehead",
        baseScore: -5,
        combatScore: 20,
        breedingScore: 10,
      },
      {
        name: "Ferocious",
        baseScore: 0,
        combatScore: 15,
        breedingScore: 8,
      },
    ],

    ivs: {
      hp: 95,
      attack: 94,
      defense: 91,
    },
  },
];