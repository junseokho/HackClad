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
  { code: "HacKClaD_Rosette_Delta_Cards_HundredDemons", name: "Hundred Demons", mpCost: 1, damage: 0, gainMp: 0, gainCp: 0, vpCard: 3 },

  // Flare-Δ Standard (8)
  { code: "HacKClaD_Flare_Delta_Cards_Shoot", name: "Shoot", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Flare_Delta_Cards_Block", name: "Block", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Flare_Delta_Cards_Move", name: "Move", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Flare_Delta_Cards_BastionBattery", name: "Bastion Battery", mpCost: 0, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Flare_Delta_Cards_Cannonade", name: "Cannonade", mpCost: 0, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Flare_Delta_Cards_ConcussionSalvo", name: "Concussion Salvo", mpCost: 0, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Flare_Delta_Cards_GantryShield", name: "Gantry Shield", mpCost: 1, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Flare_Delta_Cards_SteadyPositions", name: "Steady Positions", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },

  // Flare-Δ Enhanced (8)
  { code: "HacKClaD_Flare_Delta_Cards_RetaliatingBarrage", name: "Retaliating Barrage", mpCost: 0, damage: 2, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Flare_Delta_Cards_PinpointRocketCannon", name: "Pinpoint Rocket Cannon", mpCost: 1, damage: 2, gainMp: 0, gainCp: 1, vpCard: 3 },
  { code: "HacKClaD_Flare_Delta_Cards_LightpulsarPayload", name: "Lightpulsar Payload", mpCost: 2, damage: 5, gainMp: 0, gainCp: 0, vpCard: 2 },
  { code: "HacKClaD_Flare_Delta_Cards_LeadDownpour", name: "Lead Downpour", mpCost: 3, damage: 2, gainMp: 0, gainCp: 0, vpCard: 2 },
  { code: "HacKClaD_Flare_Delta_Cards_Logistics", name: "Logistics", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Flare_Delta_Cards_AuxillaryMana", name: "Auxillary Mana", mpCost: 0, damage: 0, gainMp: 2, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Flare_Delta_Cards_MaelstromFormation", name: "Maelstrom Formation", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Flare_Delta_Cards_DesignatedFirePoint", name: "Designated Fire Point", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 3 },

  // Luna-Δ Standard (8)
  { code: "HacKClaD_Luna_Delta_Cards_Shoot", name: "Shoot", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Luna_Delta_Cards_Block", name: "Block", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Luna_Delta_Cards_Move", name: "Move", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Luna_Delta_Cards_RuinBlade", name: "Ruin Blade", mpCost: 0, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Luna_Delta_Cards_Thunderbolt", name: "Thunderbolt", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Luna_Delta_Cards_Condemn", name: "Condemn", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Luna_Delta_Cards_Tsukuyomi", name: "Tsukuyomi", mpCost: 0, damage: 0, gainMp: 2, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Luna_Delta_Cards_ChasingMelody", name: "Chasing Melody", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },

  // Luna-Δ Enhanced (8)
  { code: "HacKClaD_Luna_Delta_Cards_Thunderstep", name: "Thunderstep", mpCost: 2, damage: 3, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Luna_Delta_Cards_EverchangingMagatama", name: "Everchanging Magatama", mpCost: 1, damage: 2, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Luna_Delta_Cards_HeavenlySwordOfGatheringClouds", name: "Heavenly Sword Of Gathering Clouds", mpCost: 2, damage: 6, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Luna_Delta_Cards_Takemikazuchi", name: "Takemikazuchi", mpCost: 3, damage: 4, gainMp: 0, gainCp: 0, vpCard: 2 },
  { code: "HacKClaD_Luna_Delta_Cards_OctspanMirror", name: "Octspan Mirror", mpCost: 1, damage: 0, gainMp: 0, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Luna_Delta_Cards_AuxillaryMana", name: "Auxillary Mana", mpCost: 0, damage: 0, gainMp: 2, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Luna_Delta_Cards_SoaringHeights", name: "Soaring Heights", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Luna_Delta_Cards_Invocation", name: "Invocation", mpCost: 1, damage: 0, gainMp: 0, gainCp: 0, vpCard: 4 },

  // Mia-Δ Standard (8, Kunai duplicated)
  { code: "HacKClaD_Mia_Delta_Cards_Shoot", name: "Shoot", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Mia_Delta_Cards_Block", name: "Block", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Mia_Delta_Cards_Move", name: "Move", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Mia_Delta_Cards_Kunai", name: "Kunai", mpCost: 0, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Mia_Delta_Cards_Kunai2", name: "Kunai", mpCost: 0, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Mia_Delta_Cards_Shuriken", name: "Shuriken", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Mia_Delta_Cards_SummonTrap", name: "Summon Trap", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Mia_Delta_Cards_IllusoryArts", name: "Illusory Arts", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },

  // Mia-Δ Enhanced (8)
  { code: "HacKClaD_Mia_Delta_Cards_Stealth", name: "Stealth", mpCost: 0, damage: 1, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Mia_Delta_Cards_Mawashigeri", name: "Mawashigeri", mpCost: 0, damage: 2, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Mia_Delta_Cards_WeaponForaging", name: "Weapon Foraging", mpCost: 1, damage: 2, gainMp: 0, gainCp: 0, vpCard: 2 },
  { code: "HacKClaD_Mia_Delta_Cards_Heelstomp", name: "Heelstomp", mpCost: 2, damage: 4, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Mia_Delta_Cards_Substitute", name: "Substitute", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Mia_Delta_Cards_ConvergenceSeal", name: "Convergence Seal", mpCost: 0, damage: 3, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Mia_Delta_Cards_AuxillaryMana", name: "Auxillary Mana", mpCost: 0, damage: 0, gainMp: 2, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Mia_Delta_Cards_Tsujigiri", name: "Tsujigiri", mpCost: 1, damage: 2, gainMp: 0, gainCp: 0, vpCard: 3 },

  // Amelia-Δ Standard (8)
  { code: "HacKClaD_Amelia_Delta_Cards_Shoot", name: "Shoot", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Amelia_Delta_Cards_Block", name: "Block", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Amelia_Delta_Cards_Move", name: "Move", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Amelia_Delta_Cards_SteelstringTransmutation", name: "Steelstring Transmutation", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Amelia_Delta_Cards_Tsuchikumo", name: "Tsuchikumo", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Amelia_Delta_Cards_ActiviationProtocol", name: "Activiation Protocol", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Amelia_Delta_Cards_Investigate", name: "Investigate", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },
  { code: "HacKClaD_Amelia_Delta_Cards_Experiment", name: "Experiment", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 1 },

  // Amelia-Δ Enhanced (8)
  { code: "HacKClaD_Amelia_Delta_Cards_ElectromagneticCannon", name: "Electromagnetic Cannon", mpCost: 1, damage: 1, gainMp: 0, gainCp: 0, vpCard: 2 },
  { code: "HacKClaD_Amelia_Delta_Cards_AuxillaryMana", name: "Auxillary Mana", mpCost: 0, damage: 0, gainMp: 2, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Amelia_Delta_Cards_DefenseNetwork", name: "Defense Network", mpCost: 0, damage: 0, gainMp: 0, gainCp: 0, vpCard: 4 },
  { code: "HacKClaD_Amelia_Delta_Cards_GatlingStorm", name: "Gatling Storm", mpCost: 0, damage: 2, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Amelia_Delta_Cards_MultithreadedOperations", name: "Multithreaded Operations", mpCost: 1, damage: 0, gainMp: 0, gainCp: 0, vpCard: 2 },
  { code: "HacKClaD_Amelia_Delta_Cards_DeepDelve", name: "Deep Delve", mpCost: 1, damage: 0, gainMp: 0, gainCp: 1, vpCard: 3 },
  { code: "HacKClaD_Amelia_Delta_Cards_Reboot", name: "Reboot", mpCost: 1, damage: 0, gainMp: 0, gainCp: 0, vpCard: 3 },
  { code: "HacKClaD_Amelia_Delta_Cards_Transfiguration", name: "Transfiguration", mpCost: 2, damage: 0, gainMp: 0, gainCp: 0, vpCard: 2 }
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
