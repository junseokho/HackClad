import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CardSeed = {
  code: string;
  name: string;
  description: string;
  costMP: number;
  tags: string;
  effectJson: string;
};

const CARDS: CardSeed[] = [
  // Sample/basic cards kept for compatibility
  {
    code: "C_BASIC_STRIKE",
    name: "Basic Strike",
    description: "Deal 1 damage to the Clad. VP +1.",
    costMP: 0,
    tags: "basic,attack",
    effectJson: JSON.stringify({ kind: "damageBoss", amount: 1, vp: 1 })
  },
  {
    code: "C_BASIC_GUARD",
    name: "Basic Guard",
    description: "Reduce incoming damage by 1.",
    costMP: 0,
    tags: "basic,defense",
    effectJson: JSON.stringify({ kind: "guard", amount: 1 })
  },
  {
    code: "C_DRAW",
    name: "Quick Draw",
    description: "Draw 1 card.",
    costMP: 0,
    tags: "draw",
    effectJson: JSON.stringify({ kind: "draw", amount: 1 })
  },
  {
    code: "C_GAIN_MP",
    name: "Mana Trickle",
    description: "Gain 1 MP.",
    costMP: 0,
    tags: "resource",
    effectJson: JSON.stringify({ kind: "gainMP", amount: 1 })
  },

  // Rosette-Δ Standard
  {
    code: "HacKClaD_Rosette_Delta_Cards_Shoot",
    name: "Shoot",
    description: "Attack | Range (0,1)(0,2) | ATK 1, MP 1, VP 1. Multistrike 2 (hits up to 2 targets).",
    costMP: 1,
    tags: "rosette-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "Multistrike 2 (hits up to 2 targets in range)"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Block",
    name: "Block",
    description: "Reaction | ATK -, MP 0, VP 1. Reduce incoming damage by 2.",
    costMP: 0,
    tags: "rosette-delta,reaction,standard",
    effectJson: JSON.stringify({
      cardType: "reaction",
      guard: 2,
      vp: 1,
      mp: 0,
      notes: "Reduce the damage of an incoming attack by 2"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Move",
    name: "Advance",
    description: "Support | MP 0, VP 1. Move 1 space.",
    costMP: 0,
    tags: "rosette-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      move: 1,
      vp: 1,
      mp: 0,
      notes: "Move 1 space"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_VitalBlow",
    name: "Vital Blow",
    description: "Attack | Range (0,1) | ATK 1, MP 0, VP 1. If attacking from the front, Repel the Clad after this attack.",
    costMP: 0,
    tags: "rosette-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 1,
      vp: 1,
      mp: 0,
      notes: "If attacking the Clad from the front, Repel the Clad after this attack"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Sweep",
    name: "Sweep",
    description: "Attack | Range (0,1) | ATK 1, MP 0, VP 1. While in discard: when you use your Crack Skill, return this card to hand.",
    costMP: 0,
    tags: "rosette-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 1,
      vp: 1,
      mp: 0,
      notes: "While in discard: when you use your Crack Skill, return this card to your hand"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Lunge",
    name: "Lunge",
    description: "Attack | Range (0,1) | ATK 2, MP 0, VP 1. Add +1 to your Injuries Gauge.",
    costMP: 0,
    tags: "rosette-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 2,
      vp: 1,
      mp: 0,
      notes: "Add +1 to your Injuries Gauge after the attack"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Determination",
    name: "Determination",
    description: "Support | MP 1, VP 1. Activate Unyielding.",
    costMP: 1,
    tags: "rosette-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 1,
      notes: "Activate Unyielding"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Challenge",
    name: "Challenge",
    description: "Support | MP 0, VP 1. Adjacent only. Turn the Clad to face you.",
    costMP: 0,
    tags: "rosette-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 0,
      notes: "Only usable when the Clad is adjacent. Turn the Clad to face its front toward you"
    })
  },

  // Rosette-Δ Enhanced
  {
    code: "HacKClaD_Rosette_Delta_Cards_Riposte",
    name: "Riposte",
    description: "Attack | Range (0,1) | ATK 2, MP 0, VP 3. Front: +1 ATK and discard the top card of your deck.",
    costMP: 0,
    tags: "rosette-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 2,
      vp: 3,
      mp: 0,
      notes: "If attacking from the front: +1 ATK and discard the top card of your deck"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Impale",
    name: "Impale",
    description: "Attack | Range (0,1) | ATK 2, MP 0, VP 4. After attack, you may spend 1 CP to turn the Clad's front toward you.",
    costMP: 0,
    tags: "rosette-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 2,
      vp: 4,
      mp: 0,
      notes: "After the attack, you may spend 1 CP to turn the Clad's front toward you"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Ratetsu",
    name: "Ratetsu",
    description: "Attack | Range (0,1) | ATK 4, MP 0, VP 2. Add +1 to your Injuries Gauge.",
    costMP: 0,
    tags: "rosette-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 4,
      vp: 2,
      mp: 0,
      notes: "Add +1 to your Injuries Gauge after the attack"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Reversal",
    name: "Reversal",
    description: "Attack | Range (0,1) | ATK 6, MP 3, VP 2. If Injuries ≥ 5: +1 ATK and Repel after attack.",
    costMP: 3,
    tags: "rosette-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 6,
      vp: 2,
      mp: 3,
      notes: "If Injuries ≥ 5: this attack has +1 ATK and you Repel the Clad after this attack"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Reap",
    name: "Reap",
    description: "Attack | Range (-1,1)(0,1)(1,1) | ATK 2, MP 1, VP 4. Multistrike 2.",
    costMP: 1,
    tags: "rosette-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: -1, y: 1 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ],
      atk: 2,
      vp: 4,
      mp: 1,
      notes: "Multistrike 2"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Carnage",
    name: "Carnage",
    description: "Reaction | MP 0, VP 4. Adjacent only. Perform 3 ATK attack and activate Unyielding.",
    costMP: 0,
    tags: "rosette-delta,reaction,enhanced",
    effectJson: JSON.stringify({
      cardType: "reaction",
      range: [{ x: 0, y: 1 }],
      atk: 3,
      vp: 4,
      mp: 0,
      notes: "Adjacent only. Perform a 3 ATK attack to the Clad and activate Unyielding"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_AuxillaryMana",
    name: "Auxillary Mana",
    description: "Support | MP 0, VP 4. Add +2 MP. You may spend 1 MP to activate Unyielding.",
    costMP: 0,
    tags: "rosette-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      gainMp: 2,
      vp: 4,
      mp: 0,
      notes: "Add +2 to your MP Gauge. You may spend 1 MP to activate Unyielding"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_HundredDemons",
    name: "Hundred Demons",
    description: "Support | MP 1, VP 3. Discard top card; you may play it. Perform your Crack Skill an additional time this turn.",
    costMP: 1,
    tags: "rosette-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 3,
      mp: 1,
      notes: "Discard the top card of your deck; you may play it. You may perform your Crack Skill an additional time this turn"
    })
  }
];

async function main() {
  for (const c of CARDS) {
    await prisma.card.upsert({
      where: { code: c.code },
      update: c,
      create: c
    });
  }

  // Characters
  const characters = [
    {
      code: "CH_WITCH_A",
      name: "Witch A",
      description: "Sample character A for early prototyping.",
      imageUrl: null
    },
    {
      code: "CH_WITCH_B",
      name: "Witch B",
      description: "Sample character B for early prototyping.",
      imageUrl: null
    },
    {
      code: "CH_ROSETTE_DELTA",
      name: "Rosette-Δ",
      description:
        "Basic actions: +1 Move (2/turn), +1 MP (2/turn), -1 DMG (1/turn). All basic actions discard 1 card. CP: 1CP reduce damage by 1 (Reaction); 2CP +1 Move or +1 MP (Support); 4CP draw 1 (Support). Crack Skill Aomagakagi (Reaction, 1CP, once/round): gain 1 Corruption, move 0-1, your attack/attack-spell cards gain +1 ATK this turn. Passive Indomitable Spirit: when you use a skill, activate Unyielding; until end of round, taking injury does not drop VP shards (other injury effects still apply).",
      imageUrl: "/assets/Character_Rosette_delta/Illust/Rosette_Delta_Portrait.webp"
    }
  ];

  for (const ch of characters) {
    await prisma.character.upsert({
      where: { code: ch.code },
      update: ch,
      create: ch
    });
  }

  const chA = await prisma.character.findUniqueOrThrow({ where: { code: "CH_WITCH_A" } });
  const chB = await prisma.character.findUniqueOrThrow({ where: { code: "CH_WITCH_B" } });
  const chRosette = await prisma.character.findUniqueOrThrow({ where: { code: "CH_ROSETTE_DELTA" } });

  const cardStrike = await prisma.card.findUniqueOrThrow({ where: { code: "C_BASIC_STRIKE" } });
  const cardGuard = await prisma.card.findUniqueOrThrow({ where: { code: "C_BASIC_GUARD" } });
  const cardDraw = await prisma.card.findUniqueOrThrow({ where: { code: "C_DRAW" } });
  const cardMP = await prisma.card.findUniqueOrThrow({ where: { code: "C_GAIN_MP" } });

  const rosetteCardCodes = [
    "HacKClaD_Rosette_Delta_Cards_Shoot",
    "HacKClaD_Rosette_Delta_Cards_Block",
    "HacKClaD_Rosette_Delta_Cards_Move",
    "HacKClaD_Rosette_Delta_Cards_VitalBlow",
    "HacKClaD_Rosette_Delta_Cards_Sweep",
    "HacKClaD_Rosette_Delta_Cards_Lunge",
    "HacKClaD_Rosette_Delta_Cards_Determination",
    "HacKClaD_Rosette_Delta_Cards_Challenge",
    "HacKClaD_Rosette_Delta_Cards_Riposte",
    "HacKClaD_Rosette_Delta_Cards_Impale",
    "HacKClaD_Rosette_Delta_Cards_Ratetsu",
    "HacKClaD_Rosette_Delta_Cards_Reversal",
    "HacKClaD_Rosette_Delta_Cards_Reap",
    "HacKClaD_Rosette_Delta_Cards_Carnage",
    "HacKClaD_Rosette_Delta_Cards_AuxillaryMana",
    "HacKClaD_Rosette_Delta_Cards_HundredDemons"
  ];

  const rosetteCards = await prisma.card.findMany({ where: { code: { in: rosetteCardCodes } } });
  const rosetteCardIdByCode = rosetteCards.reduce<Record<string, string>>((acc, c) => {
    acc[c.code] = c.id;
    return acc;
  }, {});

  // Character pools
  const pool = [
    { characterId: chA.id, cardId: cardStrike.id, isStarter: true },
    { characterId: chA.id, cardId: cardGuard.id, isStarter: true },
    { characterId: chA.id, cardId: cardDraw.id, isStarter: false },
    { characterId: chA.id, cardId: cardMP.id, isStarter: false },

    { characterId: chB.id, cardId: cardStrike.id, isStarter: true },
    { characterId: chB.id, cardId: cardDraw.id, isStarter: true },
    { characterId: chB.id, cardId: cardMP.id, isStarter: true },
    { characterId: chB.id, cardId: cardGuard.id, isStarter: false },

    // Rosette-Δ pool: 8 standard starters + 8 enhanced options
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Shoot"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Block"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Move"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_VitalBlow"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Sweep"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Lunge"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Determination"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Challenge"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Riposte"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Impale"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Ratetsu"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Reversal"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Reap"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Carnage"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_AuxillaryMana"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_HundredDemons"], isStarter: false }
  ];

  for (const p of pool) {
    await prisma.characterCard.upsert({
      where: { characterId_cardId: { characterId: p.characterId, cardId: p.cardId } },
      update: { isStarter: p.isStarter },
      create: p
    });
  }

  console.log("Seed completed (Rosette-Δ added).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
