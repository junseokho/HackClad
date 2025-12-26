export type CardDef = {
  code: string;
  name: string;
  mpCost: number;
  damage: number;
  gainMp: number;
  gainCp: number;
  vpCard: number;
};

export const SAMPLE_PLAYER_CARDS: CardDef[] = [
  // Rosette-Δ Standard (8)
  { code: "HacKClaD_Rosette_Delta_Cards_Shoot", name: "Shoot", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Rosette_Delta_Cards_Block", name: "Block", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Rosette_Delta_Cards_Move", name: "Advance", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Rosette_Delta_Cards_VitalBlow", name: "Vital Blow", mpCost: 0, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Rosette_Delta_Cards_Sweep", name: "Sweep", mpCost: 0, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Rosette_Delta_Cards_Lunge", name: "Lunge", mpCost: 0, damage: 2, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Rosette_Delta_Cards_Determination", name: "Determination", mpCost: 1, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Rosette_Delta_Cards_Challenge", name: "Challenge", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },

  // Rosette-Δ Enhanced (8)
  { code: "HacKClaD_Rosette_Delta_Cards_Riposte", name: "Riposte", mpCost: 0, damage: 2, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Rosette_Delta_Cards_Impale", name: "Impale", mpCost: 0, damage: 2, gainMp: 0, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Rosette_Delta_Cards_Ratetsu", name: "Ratetsu", mpCost: 0, damage: 4, gainMp: 0, gainCp: 0, vpCard: 2 },
  { code: "HacKClaD_Rosette_Delta_Cards_Reversal", name: "Reversal", mpCost: 3, damage: 6, gainMp: 0, gainCp: 0, vpCard: 2 },
  { code: "HacKClaD_Rosette_Delta_Cards_Reap", name: "Reap", mpCost: 1, damage: 2, gainMp: 0, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Rosette_Delta_Cards_Carnage", name: "Carnage", mpCost: 0, damage: 3, gainMp: 0, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Rosette_Delta_Cards_AuxillaryMana", name: "Auxillary Mana", mpCost: 0, damage: 0, gainMp: 2, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Rosette_Delta_Cards_HundredDemons", name: "Hundred Demons", mpCost: 1, damage: 0, gainMp: 0, gainCp: 0, vpCard: 3 }
];

export const STARTER_DECK_9: string[] = [
  // Base 8 standard cards + 1 chosen enhanced (default: Riposte)
  "HacKClaD_Rosette_Delta_Cards_Shoot",
  "HacKClaD_Rosette_Delta_Cards_Block",
  "HacKClaD_Rosette_Delta_Cards_Move",
  "HacKClaD_Rosette_Delta_Cards_VitalBlow",
  "HacKClaD_Rosette_Delta_Cards_Sweep",
  "HacKClaD_Rosette_Delta_Cards_Lunge",
  "HacKClaD_Rosette_Delta_Cards_Determination",
  "HacKClaD_Rosette_Delta_Cards_Challenge",
  "HacKClaD_Rosette_Delta_Cards_Riposte"
];

export type CladCard = { code: string; name: string; voltageDelta: number; damageAll: number };

export const CLAD_DECK: CladCard[] = [
  { code: "CLAD_A", name: "Pulse", voltageDelta: 1, damageAll: 1 },
  { code: "CLAD_B", name: "Rend", voltageDelta: 0, damageAll: 2 },
  { code: "CLAD_C", name: "Surge", voltageDelta: 2, damageAll: 0 }
];
