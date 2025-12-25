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
  { code: "ATK_1", name: "Strike", mpCost: 0, damage: 2, gainMp: 0, gainCp: 0, vpCard: 0 },
  { code: "ATK_2", name: "Pierce", mpCost: 1, damage: 4, gainMp: 0, gainCp: 0, vpCard: 0 },
  { code: "CHG_1", name: "Focus", mpCost: 0, damage: 0, gainMp: 2, gainCp: 0, vpCard: 0 },
  { code: "CP_1", name: "Rewire", mpCost: 0, damage: 0, gainMp: 0, gainCp: 1, vpCard: 0 },
  { code: "ATK_3", name: "Overclock", mpCost: 2, damage: 7, gainMp: 0, gainCp: 0, vpCard: 0 }
];

export const STARTER_DECK_9: string[] = [
  "ATK_1",
  "ATK_1",
  "ATK_1",
  "ATK_2",
  "CHG_1",
  "CHG_1",
  "CP_1",
  "ATK_1",
  "ATK_3"
];

export type CladCard = { code: string; name: string; voltageDelta: number; damageAll: number };

export const CLAD_DECK: CladCard[] = [
  { code: "CLAD_A", name: "Pulse", voltageDelta: 1, damageAll: 1 },
  { code: "CLAD_B", name: "Rend", voltageDelta: 0, damageAll: 2 },
  { code: "CLAD_C", name: "Surge", voltageDelta: 2, damageAll: 0 }
];
