import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Cards
  const cards = [
    {
      code: "C_BASIC_STRIKE",
      name: "기본 공격",
      description: "보스에게 1 피해를 준다. (VP +1)",
      costMP: 0,
      tags: "basic,attack",
      effectJson: JSON.stringify({ kind: "damageBoss", amount: 1 })
    },
    {
      code: "C_BASIC_GUARD",
      name: "기본 방어",
      description: "이번 라운드에 받는 피해 1 감소(예시).",
      costMP: 0,
      tags: "basic,defense",
      effectJson: JSON.stringify({ kind: "guard", amount: 1 })
    },
    {
      code: "C_DRAW",
      name: "추가 뽑기",
      description: "카드 1장을 뽑는다.",
      costMP: 0,
      tags: "draw",
      effectJson: JSON.stringify({ kind: "draw", amount: 1 })
    },
    {
      code: "C_GAIN_MP",
      name: "마력 충전",
      description: "MP를 1 얻는다.",
      costMP: 0,
      tags: "resource",
      effectJson: JSON.stringify({ kind: "gainMP", amount: 1 })
    }
  ];

  for (const c of cards) {
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
      name: "마녀 A",
      description: "기본형 마녀. 공격/방어가 균형적.",
      imageUrl: null
    },
    {
      code: "CH_WITCH_B",
      name: "마녀 B",
      description: "드로우/자원에 특화된 마녀.",
      imageUrl: null
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

  const cardStrike = await prisma.card.findUniqueOrThrow({ where: { code: "C_BASIC_STRIKE" } });
  const cardGuard = await prisma.card.findUniqueOrThrow({ where: { code: "C_BASIC_GUARD" } });
  const cardDraw = await prisma.card.findUniqueOrThrow({ where: { code: "C_DRAW" } });
  const cardMP = await prisma.card.findUniqueOrThrow({ where: { code: "C_GAIN_MP" } });

  // Character pools
  const pool = [
    { characterId: chA.id, cardId: cardStrike.id, isStarter: true },
    { characterId: chA.id, cardId: cardGuard.id, isStarter: true },
    { characterId: chA.id, cardId: cardDraw.id, isStarter: false },
    { characterId: chA.id, cardId: cardMP.id, isStarter: false },

    { characterId: chB.id, cardId: cardStrike.id, isStarter: true },
    { characterId: chB.id, cardId: cardDraw.id, isStarter: true },
    { characterId: chB.id, cardId: cardMP.id, isStarter: true },
    { characterId: chB.id, cardId: cardGuard.id, isStarter: false }
  ];

  for (const p of pool) {
    await prisma.characterCard.upsert({
      where: { characterId_cardId: { characterId: p.characterId, cardId: p.cardId } },
      update: { isStarter: p.isStarter },
      create: p
    });
  }

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
