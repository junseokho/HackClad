// apps/web/src/pages/GameRoom.tsx
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GameWS } from "../api/ws";

type Facing = "N" | "E" | "S" | "W";
type Vec2 = { x: number; y: number };

type CladAction =
  | { type: "attack"; offsets: Vec2[] }
  | { type: "summon"; offsets: Vec2[] }
  | { type: "vpDrop"; offsets: Vec2[] }
  | { type: "move"; offset: Vec2 }
  | { type: "turn"; dir: "left" | "right" }
  | { type: "special"; kind: "homecoming" };

type CladCard = { code: string; name: string; voltage: number; actions: CladAction[] };
type ActionQueueEntry = { type: "player"; userId: string } | { type: "boss"; cardIndex: number; cardCode: string };

function isPlayerStep(step: ActionQueueEntry): step is { type: "player"; userId: string } {
  return step.type === "player";
}

const CLAD_CARDS: Record<string, CladCard> = {
  HacKClaD_Clad_Hydra_Backslam: {
    code: "HacKClaD_Clad_Hydra_Backslam",
    name: "Backslam",
    voltage: 1,
    actions: [
      { type: "attack", offsets: [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 0, y: -2 }] },
      { type: "vpDrop", offsets: [{ x: 0, y: -1 }] },
    ],
  },
  HacKClaD_Clad_Hydra_CrashingFootfallsLeft: {
    code: "HacKClaD_Clad_Hydra_CrashingFootfallsLeft",
    name: "Crashing Footfalls (L)",
    voltage: 3,
    actions: [
      {
        type: "attack",
        offsets: [
          { x: -1, y: -1 },
          { x: -1, y: -2 },
          { x: -1, y: 0 },
          { x: -1, y: 1 },
          { x: -1, y: 2 },
          { x: -2, y: -1 },
          { x: -2, y: -2 },
          { x: -2, y: 0 },
          { x: -2, y: 1 },
          { x: -2, y: 2 },
        ],
      },
      { type: "summon", offsets: [{ x: -1, y: 1 }] },
      { type: "vpDrop", offsets: [{ x: -1, y: 0 }, { x: -2, y: 0 }] },
      { type: "move", offset: { x: 0, y: 1 } },
    ],
  },
  HacKClaD_Clad_Hydra_CrashingFootfallsRight: {
    code: "HacKClaD_Clad_Hydra_CrashingFootfallsRight",
    name: "Crashing Footfalls (R)",
    voltage: 3,
    actions: [
      {
        type: "attack",
        offsets: [
          { x: 1, y: -1 },
          { x: 1, y: -2 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: -1 },
          { x: 2, y: -2 },
          { x: 2, y: 0 },
          { x: 2, y: 1 },
          { x: 2, y: 2 },
        ],
      },
      { type: "summon", offsets: [{ x: 1, y: 1 }] },
      { type: "vpDrop", offsets: [{ x: 1, y: 0 }, { x: 2, y: 0 }] },
      { type: "move", offset: { x: 0, y: 1 } },
    ],
  },
  HacKClaD_Clad_Hydra_HomecomingInstinct: {
    code: "HacKClaD_Clad_Hydra_HomecomingInstinct",
    name: "Homecoming Instinct",
    voltage: 3,
    actions: [
      { type: "special", kind: "homecoming" },
      { type: "summon", offsets: [{ x: 1, y: 2 }, { x: 2, y: -1 }, { x: -2, y: 1 }, { x: -1, y: -2 }] },
    ],
  },
  HacKClaD_Clad_Hydra_IncineratingFlames: {
    code: "HacKClaD_Clad_Hydra_IncineratingFlames",
    name: "Incinerating Flames",
    voltage: 2,
    actions: [
      {
        type: "attack",
        offsets: [
          { x: -2, y: 1 },
          { x: -2, y: 2 },
          { x: -1, y: 1 },
          { x: -1, y: 2 },
          { x: 0, y: 1 },
          { x: 0, y: 2 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 1 },
          { x: 2, y: 2 },
        ],
      },
      { type: "summon", offsets: [{ x: 0, y: 1 }] },
      { type: "turn", dir: "right" },
    ],
  },
  HacKClaD_Clad_Hydra_SavageFangs: {
    code: "HacKClaD_Clad_Hydra_SavageFangs",
    name: "Savage Fangs",
    voltage: 1,
    actions: [
      { type: "attack", offsets: [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
      { type: "vpDrop", offsets: [{ x: 0, y: 1 }] },
      { type: "turn", dir: "left" },
    ],
  },
  HacKClaD_Clad_Hydra_ScorchingBreath: {
    code: "HacKClaD_Clad_Hydra_ScorchingBreath",
    name: "Scorching Breath",
    voltage: 1,
    actions: [
      { type: "attack", offsets: [{ x: -1, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
      { type: "vpDrop", offsets: [{ x: 0, y: 2 }] },
    ],
  },
  HacKClaD_Clad_Hydra_Skewer: {
    code: "HacKClaD_Clad_Hydra_Skewer",
    name: "Skewer",
    voltage: 1,
    actions: [{ type: "summon", offsets: [{ x: -1, y: 0 }, { x: 1, y: 0 }] }],
  },
  HacKClaD_Clad_Hydra_SpiralAmbushLeft: {
    code: "HacKClaD_Clad_Hydra_SpiralAmbushLeft",
    name: "Spiral Ambush (L)",
    voltage: 1,
    actions: [
      { type: "summon", offsets: [{ x: 1, y: 1 }] },
      { type: "turn", dir: "left" },
    ],
  },
  HacKClaD_Clad_Hydra_SpiralAmbushRight: {
    code: "HacKClaD_Clad_Hydra_SpiralAmbushRight",
    name: "Spiral Ambush (R)",
    voltage: 1,
    actions: [
      { type: "summon", offsets: [{ x: -1, y: 1 }] },
      { type: "turn", dir: "right" },
    ],
  },
  HacKClaD_Clad_Hydra_SweepingStrike: {
    code: "HacKClaD_Clad_Hydra_SweepingStrike",
    name: "Sweeping Strike",
    voltage: 2,
    actions: [
      {
        type: "attack",
        offsets: [
          { x: -1, y: 1 },
          { x: -1, y: 0 },
          { x: -1, y: -1 },
          { x: 1, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: -1 },
        ],
      },
      { type: "vpDrop", offsets: [{ x: 1, y: 1 }, { x: -1, y: 1 }] },
      { type: "move", offset: { x: 0, y: 1 } },
    ],
  },
  HacKClaD_Clad_Hydra_TerrainCrush: {
    code: "HacKClaD_Clad_Hydra_TerrainCrush",
    name: "Terrain Crush",
    voltage: 2,
    actions: [
      { type: "summon", offsets: [{ x: 0, y: -1 }] },
      { type: "move", offset: { x: 0, y: 1 } },
      { type: "move", offset: { x: 0, y: 1 } },
    ],
  },
};

function getCladCard(code: string): CladCard | null {
  return CLAD_CARDS[code] ?? null;
}

// Vite static import for card images
const CLAD_IMAGES = import.meta.glob("../assets/Clad_Hydra/*", { eager: true, as: "url" }) as Record<string, string>;
const CLAD_ICON = CLAD_IMAGES["../assets/Clad_Hydra/Hydra_Clad_Icon.webp"];
const CLAD_REGION_ICON = CLAD_IMAGES["../assets/Clad_Hydra/Hydra_Clad_Region_Icon.webp"];
const CLAD_REGION_ICON_TAIL = CLAD_IMAGES["../assets/Clad_Hydra/Hydra_Clad_Region_Icon_Tail.webp"];
const BOARD_BG = new URL("../assets/board-bg.webp", import.meta.url).href;
const MIA_TRAP_FRONT = new URL("../assets/Character_Mia_delta/trap_icon/Conibear_Trap_Front.png", import.meta.url).href;
const MIA_TRAP_BACK = new URL("../assets/Character_Mia_delta/trap_icon/Conibear_Trap_Back.png", import.meta.url).href;
const CHAR_IMAGES = import.meta.glob("../assets/Character_*/Illust/*", {
  eager: true,
  as: "url",
}) as Record<string, string>;

function findCharImage(path?: string | null, code?: string | null) {
  if (path) {
    const filename = path.split("/").pop();
    const byFile = filename ? Object.keys(CHAR_IMAGES).find((k) => k.endsWith(`/${filename}`)) : null;
    if (byFile) return CHAR_IMAGES[byFile];
  }
  if (code) {
    const byCode =
      Object.keys(CHAR_IMAGES).find((k) => k.endsWith(`/${code}.webp`) || k.endsWith(`/${code}.png`) || k.endsWith(`/${code}.jpg`)) ??
      null;
    if (byCode) return CHAR_IMAGES[byCode];
  }
  return "";
}

const SPAWN_POINTS: { x: number; y: number; label: string }[] = [
  { x: -2, y: -1, label: "(-2, -1)" },
  { x: 2, y: 1, label: "(2, 1)" },
  { x: -1, y: 2, label: "(-1, 2)" },
  { x: 1, y: -2, label: "(1, -2)" },
];

function entryPoints(state: GameState | null, meId: string) {
  const entries = [
    { x: -2, y: -1 },
    { x: 2, y: 1 },
    { x: -1, y: 2 },
    { x: 1, y: -2 },
  ];
  return entries.filter(
    (ep) => !(state?.players ?? []).some((p) => p.userId !== meId && p.position && p.position.x === ep.x && p.position.y === ep.y)
  );
}

function cardImage(code: string) {
  const png = CLAD_IMAGES[`../assets/Clad_Hydra/${code}.png`];
  const webp = CLAD_IMAGES[`../assets/Clad_Hydra/${code}.webp`];
  const jpg = CLAD_IMAGES[`../assets/Clad_Hydra/${code}.jpg`];
  return png ?? webp ?? jpg ?? "";
}

// Player card images (all characters)
const PLAYER_CARD_IMAGES = import.meta.glob("../assets/Character_*/{Standard,Enhanced}/*", {
  eager: true,
  as: "url",
}) as Record<string, string>;

const TYPE_ICON_IMAGES = import.meta.glob("../assets/type_icon/*.webp", {
  eager: true,
  as: "url",
}) as Record<string, string>;

const TYPE_ICON_MAP: Record<"attack" | "reaction" | "support", string> = {
  attack: TYPE_ICON_IMAGES["../assets/type_icon/22px-HacKClaD_Attack_Icon.webp"],
  reaction: TYPE_ICON_IMAGES["../assets/type_icon/22px-HacKClaD_Reaction_Icon.webp"],
  support: TYPE_ICON_IMAGES["../assets/type_icon/22px-HacKClaD_Support_Icon.webp"],
};

type PlayerCardDetail = { name: string; type: string; mp: number; vp?: number; atk?: string; text: string; tag?: string };
type RangeCoord = { x: number; y: number };

function typeIconUrl(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("reaction")) return TYPE_ICON_MAP.reaction;
  if (normalized.includes("support")) return TYPE_ICON_MAP.support;
  if (normalized.includes("attack")) return TYPE_ICON_MAP.attack;
  return "";
}

function extractRange(text: string): { cleaned: string; coords: RangeCoord[] | null } {
  const rangeRegex = /(사거리|Range)\s*(\([-?\d\s,]+\))+(\s*·\s*)?/;
  const coords: RangeCoord[] = [];
  const cleaned = text.replace(rangeRegex, "").replace(/\s*·\s*$/, "").trim();
  const matches = text.matchAll(/\((-?\d+),\s*(-?\d+)\)/g);
  for (const match of matches) {
    coords.push({ x: Number(match[1]), y: Number(match[2]) });
  }
  return { cleaned, coords: coords.length > 0 ? coords : null };
}

function rangeIcon(coords: RangeCoord[], size: "sm" | "md" = "sm") {
  const cell = size === "sm" ? 4 : 5;
  const gap = 2;
  const box = cell * 5 + gap * 4;
  const active = new Set(coords.map((c) => `${c.x},${c.y}`));
  const cells: ReactElement[] = [];
  for (let y = 2; y >= -2; y -= 1) {
    for (let x = -2; x <= 2; x += 1) {
      const isCenter = x === 0 && y === 0;
      const isActive = active.has(`${x},${y}`);
      cells.push(
        <div
          key={`${x},${y}`}
          className={`rounded-[1px] ${isActive ? "bg-red-500" : isCenter ? "bg-slate-500/60" : "bg-slate-600/60"}`}
          style={{ width: cell, height: cell }}
        />
      );
    }
  }
  return (
    <div
      className="grid rounded-md bg-slate-800/80 p-1"
      style={{ gridTemplateColumns: `repeat(5, ${cell}px)`, gridTemplateRows: `repeat(5, ${cell}px)`, gap, width: box + 8, height: box + 8 }}
      aria-label="사거리"
    >
      {cells}
    </div>
  );
}

const ROSETTE_CARD_DETAILS: Record<string, PlayerCardDetail> = {
  HacKClaD_Rosette_Delta_Cards_Shoot: {
    name: "Shoot",
    type: "Attack",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)(0,2) · 다중타 2회",
    text: "사거리 내 최대 2개 대상에게 피해를 줍니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Block: {
    name: "Block",
    type: "Reaction",
    mp: 0,
    vp: 1,
    text: "들어오는 피해를 2 줄입니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Move: {
    name: "Advance",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "1칸 이동합니다.",
  },
  HacKClaD_Rosette_Delta_Cards_VitalBlow: {
    name: "Vital Blow",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)",
    text: "정면에서 공격했다면, 공격 후 클래드를 밀쳐냅니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Sweep: {
    name: "Sweep",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)",
    text: "버린 패에 있을 때: 크랙 스킬 사용 시 이 카드를 손으로 되돌립니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Lunge: {
    name: "Lunge",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 2 · 사거리 (0,1)",
    text: "부상 게이지를 1 올립니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Determination: {
    name: "Determination",
    type: "Support",
    mp: 1,
    vp: 1,
    text: "Unyielding을 발동합니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Challenge: {
    name: "Challenge",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "인접 시에만 사용. 클래드의 앞면이 나를 향하도록 돌립니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Riposte: {
    name: "Riposte",
    type: "Attack",
    mp: 0,
    vp: 3,
    atk: "ATK 2 · 사거리 (0,1)",
    text: "정면에서 공격 시: ATK +1, 내 덱 맨 위 카드를 버립니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Impale: {
    name: "Impale",
    type: "Attack",
    mp: 0,
    vp: 4,
    atk: "ATK 2 · 사거리 (0,1)",
    text: "공격 후 CP 1을 지불해 클래드의 앞면을 나를 향하게 돌릴 수 있습니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Ratetsu: {
    name: "Ratetsu",
    type: "Attack",
    mp: 0,
    vp: 2,
    atk: "ATK 4 · 사거리 (0,1)",
    text: "부상 게이지를 1 올립니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Reversal: {
    name: "Reversal",
    type: "Attack",
    mp: 3,
    vp: 2,
    atk: "ATK 6 · 사거리 (0,1)",
    text: "부상 ≥ 5라면 ATK +1, 공격 후 클래드를 밀쳐냅니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Reap: {
    name: "Reap",
    type: "Attack",
    mp: 1,
    vp: 4,
    atk: "ATK 2 · 사거리 (-1,1)(0,1)(1,1) · 다중타 2회",
    text: "최대 2개 대상에게 피해를 줍니다.",
  },
  HacKClaD_Rosette_Delta_Cards_Carnage: {
    name: "Carnage",
    type: "Reaction",
    mp: 0,
    vp: 4,
    atk: "ATK 3 · 인접",
    text: "인접 시에만 사용. ATK 3으로 클래드를 공격하고 Unyielding을 발동합니다.",
  },
  HacKClaD_Rosette_Delta_Cards_AuxillaryMana: {
    name: "Auxillary Mana",
    type: "Support",
    mp: 0,
    vp: 4,
    text: "MP를 2 얻습니다. 추가로 MP 1을 지불해 Unyielding을 발동할 수 있습니다.",
  },
  HacKClaD_Rosette_Delta_Cards_HundredDemons: {
    name: "Hundred Demons",
    type: "Support",
    mp: 1,
    vp: 3,
    text: "덱 맨 위 카드를 버리고, 그 카드를 즉시 사용할 수 있습니다. 이번 턴 크랙 스킬을 한 번 더 사용할 수 있습니다.",
  },
};

const FLARE_CARD_DETAILS: Record<string, PlayerCardDetail> = {
  HacKClaD_Flare_Delta_Cards_Shoot: {
    name: "Shoot",
    type: "Attack",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)(0,2) · 다중타 2회",
    text: "사거리 내 최대 2개 대상에게 피해를 줍니다.",
  },
  HacKClaD_Flare_Delta_Cards_Block: {
    name: "Block",
    type: "Reaction",
    mp: 0,
    vp: 1,
    text: "들어오는 피해를 2 줄입니다.",
  },
  HacKClaD_Flare_Delta_Cards_Move: {
    name: "Move",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "1칸 이동합니다.",
  },
  HacKClaD_Flare_Delta_Cards_BastionBattery: {
    name: "Bastion Battery",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)(0,2)",
    text: '이 카드를 "-1 DMG" 기본 행동으로 버렸다면 Intercept 1을 수행합니다.',
  },
  HacKClaD_Flare_Delta_Cards_Cannonade: {
    name: "Cannonade",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)(0,2)",
    text: "이번 턴 이동하지 않았다면 ATK +1을 선택할 수 있습니다. 그렇게 했다면 이번 턴 나머지 동안 이동할 수 없습니다.",
  },
  HacKClaD_Flare_Delta_Cards_ConcussionSalvo: {
    name: "Concussion Salvo",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 1 · 사거리 (-1,2)(0,2)(1,2)",
    text: "이번 라운드 동안 클래드는 이동하거나 밀려나지 않습니다. (방향 전환은 가능합니다.)",
  },
  HacKClaD_Flare_Delta_Cards_GantryShield: {
    name: "Gantry Shield",
    type: "Support",
    mp: 1,
    vp: 1,
    text: "Intercept 2를 수행합니다. 들어오는 공격 피해를 2 줄입니다.",
  },
  HacKClaD_Flare_Delta_Cards_SteadyPositions: {
    name: "Steady Positions",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "이번 라운드 다음에 받는 피해를 2 줄입니다. 이번 턴 이동하지 않았다면 CP 1을 얻고 즉시 턴을 종료합니다.",
  },
  HacKClaD_Flare_Delta_Cards_RetaliatingBarrage: {
    name: "Retaliating Barrage",
    type: "Attack",
    mp: 0,
    vp: 3,
    atk: "ATK 2 · 사거리 (-1,2)(0,2)(1,2)",
    text: '이 카드를 "-1 DMG" 기본 행동으로 버렸다면 Intercept 3을 수행합니다.',
  },
  HacKClaD_Flare_Delta_Cards_PinpointRocketCannon: {
    name: "Pinpoint Rocket Cannon",
    type: "Attack",
    mp: 1,
    vp: 3,
    atk: "ATK 2 · 사거리 (0,1)(0,2)",
    text: "CP 게이지를 1 올립니다.",
  },
  HacKClaD_Flare_Delta_Cards_LightpulsarPayload: {
    name: "Lightpulsar Payload",
    type: "Attack",
    mp: 2,
    vp: 2,
    atk: "ATK 5 + X · 사거리 (0,2)",
    text: "추가 비용: 원하는 만큼 CP를 지불합니다. X는 지불한 CP입니다.",
  },
  HacKClaD_Flare_Delta_Cards_LeadDownpour: {
    name: "Lead Downpour",
    type: "Attack",
    mp: 3,
    vp: 2,
    atk: "ATK 2 · 사거리 (-1,1)(-1,2)(0,1)(0,2)(1,1)(1,2) · 다중타 3회",
    text: "추가로 CP 3을 지불할 수 있습니다. 그렇게 했다면 이 카드의 ATK가 1 증가합니다.",
  },
  HacKClaD_Flare_Delta_Cards_Logistics: {
    name: "Logistics",
    type: "Reaction",
    mp: 0,
    vp: 4,
    text: "서로 다른 옵션 2개 선택: 들어오는 피해 2 감소 / 카드 1장 드로우 / 버린 패 1장을 손으로 되돌리기.",
  },
  HacKClaD_Flare_Delta_Cards_AuxillaryMana: {
    name: "Auxillary Mana",
    type: "Support",
    mp: 0,
    vp: 4,
    text: 'MP를 2 얻습니다. 이 카드를 "-1 DMG" 기본 행동으로 버렸다면 Intercept 2를 수행합니다.',
  },
  HacKClaD_Flare_Delta_Cards_MaelstromFormation: {
    name: "Maelstrom Formation",
    type: "Support",
    mp: 0,
    vp: 3,
    text: '이 카드를 "-1 DMG" 기본 행동으로 버릴 때 CP 게이지를 1 올립니다.\n버린 패에 있을 때: CP를 쓰지 않고 리액션(기본 행동 포함)을 수행하면 CP 게이지를 1 올립니다.',
  },
  HacKClaD_Flare_Delta_Cards_DesignatedFirePoint: {
    name: "Designated Fire Point",
    type: "Support",
    mp: 0,
    vp: 3,
    text: "이번 턴 남은 동안 이동할 수 없습니다. 당신의 다음 공격/공격 마법 카드는 ATK +1, 사거리 무시 효과를 얻습니다.",
  },
};

const MIA_CARD_DETAILS: Record<string, PlayerCardDetail> = {
  HacKClaD_Mia_Delta_Cards_Shoot: {
    name: "Shoot",
    type: "Attack",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)(0,2) · 다중타 2회",
    text: "사거리 내 최대 2개 대상에게 피해를 줍니다.",
  },
  HacKClaD_Mia_Delta_Cards_Block: {
    name: "Block",
    type: "Reaction",
    mp: 0,
    vp: 1,
    text: "들어오는 피해를 2 줄입니다.",
  },
  HacKClaD_Mia_Delta_Cards_Move: {
    name: "Move",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "1칸 이동합니다.",
  },
  HacKClaD_Mia_Delta_Cards_Kunai: {
    name: "Kunai",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)",
    text: "추가 효과 없음.",
  },
  HacKClaD_Mia_Delta_Cards_Kunai2: {
    name: "Kunai",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)",
    text: "추가 효과 없음.",
  },
  HacKClaD_Mia_Delta_Cards_Shuriken: {
    name: "Shuriken",
    type: "Attack",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,2)",
    text: "공격 후 이 카드를 턴 카드 위에 뒷면으로 버립니다. 턴 카드를 드로우할 때 두 장을 함께 드로우합니다.",
  },
  HacKClaD_Mia_Delta_Cards_SummonTrap: {
    name: "Summon Trap",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "뒷면인 코니베어 트랩 1장을 앞면으로 뒤집습니다.",
  },
  HacKClaD_Mia_Delta_Cards_IllusoryArts: {
    name: "Illusory Arts",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "클래드와 인접할 때만 사용. 클래드의 등(뒤쪽)이 나를 향하도록 돌립니다.",
  },
  HacKClaD_Mia_Delta_Cards_Stealth: {
    name: "Stealth",
    type: "Attack",
    mp: 0,
    vp: 3,
    atk: "ATK 1 · 사거리 (0,1)",
    text: "클래드의 뒤에서 공격했다면 카드 1장을 드로우합니다. 이 효과는 라운드당 1회만 발동합니다.",
  },
  HacKClaD_Mia_Delta_Cards_Mawashigeri: {
    name: "Mawashigeri",
    type: "Attack",
    mp: 0,
    vp: 3,
    atk: "ATK 2 · 사거리 (0,1)",
    text: "클래드의 뒤에서 공격했다면 뒷면인 코니베어 트랩 1장을 앞면으로 뒤집습니다.",
  },
  HacKClaD_Mia_Delta_Cards_WeaponForaging: {
    name: "Weapon Foraging",
    type: "Attack",
    mp: 1,
    vp: 2,
    atk: "ATK 2 · 사거리 (0,1)",
    text: "버린 패의 쿠나이 전부를 손으로 되돌립니다.",
  },
  HacKClaD_Mia_Delta_Cards_Heelstomp: {
    name: "Heelstomp",
    type: "Attack",
    mp: 2,
    vp: 3,
    atk: "ATK 4 · 사거리 (0,1)",
    text: "추가 비용: 손의 쿠나이 1장을 버릴 수 있습니다. 그렇게 했다면 이 카드 ATK +1, 공격 후 클래드를 밀쳐냅니다.",
  },
  HacKClaD_Mia_Delta_Cards_Substitute: {
    name: "Substitute",
    type: "Reaction",
    mp: 0,
    vp: 4,
    text: "추가 비용: 앞면인 코니베어 트랩 1장을 뒷면으로 뒤집습니다. 비어있는 칸 1개를 선택해 그 칸으로 이동합니다. 이동 1칸으로 취급합니다.",
  },
  HacKClaD_Mia_Delta_Cards_ConvergenceSeal: {
    name: "Convergence Seal",
    type: "Support",
    mp: 0,
    vp: 3,
    text: "이 카드가 버린 패로 갈 때, 이번 턴 클래드/레기온에게 총 4 이상 피해를 줬다면 클래드에게 3 피해를 줍니다. 이 효과는 턴당 1회만 발동합니다.",
  },
  HacKClaD_Mia_Delta_Cards_AuxillaryMana: {
    name: "Auxillary Mana",
    type: "Support",
    mp: 0,
    vp: 4,
    text: "MP를 2 얻습니다. MP 1을 지불해 뒷면인 코니베어 트랩 1장을 앞면으로 뒤집을 수 있습니다.",
  },
  HacKClaD_Mia_Delta_Cards_Tsujigiri: {
    name: "Tsujigiri",
    type: "Support",
    mp: 1,
    vp: 3,
    text: "2칸 이동합니다. 다른 마녀/클래드/레기온을 통과할 수 있습니다. 지나간 칸의 클래드/레기온마다 2 피해를 주고, 지나간 마력 파편을 획득합니다.",
  },
};

const PLAYER_CARD_DETAILS: Record<string, PlayerCardDetail> = {
  ...ROSETTE_CARD_DETAILS,
  ...FLARE_CARD_DETAILS,
  ...MIA_CARD_DETAILS,
  HacKClaD_Amelia_Delta_Cards_Shoot: {
    name: "Shoot",
    type: "Attack",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · Range (0,1)(0,2) · Multistrike 2",
    text: "Hits up to 2 targets in range.",
  },
  HacKClaD_Amelia_Delta_Cards_Block: {
    name: "Block",
    type: "Reaction",
    mp: 0,
    vp: 1,
    text: "Reduce the damage of an incoming attack by 2.",
  },
  HacKClaD_Amelia_Delta_Cards_Move: {
    name: "Move",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "Perform Maneuver: Movement / Harvest / Assault (choose one).",
  },
  HacKClaD_Amelia_Delta_Cards_SteelstringTransmutation: {
    name: "Steelstring Transmutation",
    type: "Attack",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · Range (0,1)(0,2)",
    text: "This card has +1 ATK for every 3 cards in your discard pile.",
  },
  HacKClaD_Amelia_Delta_Cards_Tsuchikumo: {
    name: "Tsuchikumo",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "Perform Maneuver: Deployment. Move up to 1 space.",
  },
  HacKClaD_Amelia_Delta_Cards_ActiviationProtocol: {
    name: "Activiation Protocol",
    type: "Support",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · Range (0,1)",
    text: "After the Attack, discard this card face-down on your Turn Card. When you draw your Turn Card, draw both cards.",
  },
  HacKClaD_Amelia_Delta_Cards_Investigate: {
    name: "Investigate",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "You may perform Maneuver: Movement. Look at the top card of your deck. You may discard that card.",
  },
  HacKClaD_Amelia_Delta_Cards_Experiment: {
    name: "Experiment",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "Extra Cost: Remove a Tsuchikumo from the board. Add a random Enhanced card to your discard pile (increases max deck size).",
  },
  HacKClaD_Amelia_Delta_Cards_ElectromagneticCannon: {
    name: "Electromagnetic Cannon",
    type: "Attack",
    mp: 1,
    vp: 2,
    atk: "ATK X · Range (0,1)(0,2)",
    text: "X equals the number of cards in your discard pile minus 3 (minimum 0).",
  },
  HacKClaD_Amelia_Delta_Cards_AuxillaryMana: {
    name: "Auxillary Mana",
    type: "Support",
    mp: 0,
    vp: 4,
    text: "Add +2 MP. You may spend 1 MP to perform Maneuver: Deployment / Movement / Harvest / Assault.",
  },
  HacKClaD_Amelia_Delta_Cards_DefenseNetwork: {
    name: "Defense Network",
    type: "Support",
    mp: 0,
    vp: 4,
    text: "Perform Maneuver: Deployment.\nWhile in discard: reduce incoming damage by X, where X is the number of Tsuchikumo influencing your space.",
  },
  HacKClaD_Amelia_Delta_Cards_GatlingStorm: {
    name: "Gatling Storm",
    type: "Support",
    mp: 0,
    vp: 3,
    text: "Perform Maneuver: Assault twice. If you have 5 or more Tsuchikumo deployed, perform Maneuver: Assault an additional time.",
  },
  HacKClaD_Amelia_Delta_Cards_MultithreadedOperations: {
    name: "Multithreaded Operations",
    type: "Support",
    mp: 1,
    vp: 2,
    text: "During this turn, Tsuchikumo deal +1 damage to the Clad and Legions (stackable).\nWhile in discard: once per turn, you may perform Maneuver: Movement / Harvest / Assault.",
  },
  HacKClaD_Amelia_Delta_Cards_DeepDelve: {
    name: "Deep Delve",
    type: "Support",
    mp: 1,
    vp: 3,
    text: "Add +1 to your CP Gauge. If your deck has 5 or more cards, draw a card.",
  },
  HacKClaD_Amelia_Delta_Cards_Reboot: {
    name: "Reboot",
    type: "Support",
    mp: 1,
    vp: 3,
    text: "Choose a card from your discard pile and return it to your hand.",
  },
  HacKClaD_Amelia_Delta_Cards_Transfiguration: {
    name: "Transfiguration",
    type: "Support",
    mp: 2,
    vp: 2,
    text: "You cannot reshuffle your deck until end of turn. Remove up to X Tsuchikumo from the board (X = cards currently in deck). Draw as many cards as Tsuchikumo were removed.",
  },
  HacKClaD_Luna_Delta_Cards_Shoot: {
    name: "Shoot",
    type: "Attack",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)(0,2) · 다중타 2회",
    text: "사거리 내 최대 2개 대상에게 피해를 줍니다.",
  },
  HacKClaD_Luna_Delta_Cards_Block: {
    name: "Block",
    type: "Reaction",
    mp: 0,
    vp: 1,
    text: "들어오는 피해를 2 줄입니다.",
  },
  HacKClaD_Luna_Delta_Cards_Move: {
    name: "Move",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "1칸 이동합니다.",
  },
  HacKClaD_Luna_Delta_Cards_RuinBlade: {
    name: "Ruin Blade",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)",
    text: "클래드를 대상으로 한다면 ATK +1.",
  },
  HacKClaD_Luna_Delta_Cards_Thunderbolt: {
    name: "Thunderbolt",
    type: "Attack",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · 사거리 (-1,2)(0,1)(0,2)(1,2)",
    text: "이번 턴에 공격/공격 마법 카드를 사용했다면 ATK +1.",
  },
  HacKClaD_Luna_Delta_Cards_Condemn: {
    name: "Condemn",
    type: "Attack",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · 사거리 (0,1)(0,2)",
    text: "클래드 덱 맨 위를 봅니다(공개 선택). 전압 1을 공개했거나 덱이 비어있다면 ATK +1.",
  },
  HacKClaD_Luna_Delta_Cards_Tsukuyomi: {
    name: "Tsukuyomi",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "MP를 2 얻습니다. 점괘를 수행합니다.",
  },
  HacKClaD_Luna_Delta_Cards_ChasingMelody: {
    name: "Chasing Melody",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "이번 턴 다음 공격/공격 마법 카드가 다중타 2회를 얻습니다.",
  },
  HacKClaD_Luna_Delta_Cards_Thunderstep: {
    name: "Thunderstep",
    type: "Attack",
    mp: 2,
    vp: 3,
    atk: "ATK 3 · 사거리 (-1,2)(0,2)(1,2)",
    text: "이 공격으로 레기온을 처치했다면 그 칸으로 이동할 수 있습니다(여러 개면 하나 선택).",
  },
  HacKClaD_Luna_Delta_Cards_EverchangingMagatama: {
    name: "Everchanging Magatama",
    type: "Attack",
    mp: 1,
    vp: 3,
    atk: "ATK 2 · 사거리 (0,1)(0,2)",
    text: "클래드 덱 맨 위를 봅니다(공개 선택). 전압 1을 공개했거나 덱이 비어있다면 ATK +1.",
  },
  HacKClaD_Luna_Delta_Cards_HeavenlySwordOfGatheringClouds: {
    name: "Heavenly Sword Of Gathering Clouds",
    type: "Attack",
    mp: 2,
    vp: 3,
    atk: "ATK 6 · 사거리 (0,1)",
    text: "이 공격은 클래드만 대상으로 합니다.",
  },
  HacKClaD_Luna_Delta_Cards_Takemikazuchi: {
    name: "Takemikazuchi",
    type: "Attack",
    mp: 3,
    vp: 2,
    atk: "ATK 4+X · 사거리 (-1,2)(0,1)(0,2)(1,2)",
    text: "X는 이번 턴 사용한 지원/지원 마법 카드 수입니다(기본 행동 제외).",
  },
  HacKClaD_Luna_Delta_Cards_OctspanMirror: {
    name: "Octspan Mirror",
    type: "Reaction",
    mp: 1,
    vp: 4,
    text: "클래드의 방향을 반대로 뒤집습니다.",
  },
  HacKClaD_Luna_Delta_Cards_AuxillaryMana: {
    name: "Auxillary Mana",
    type: "Support",
    mp: 0,
    vp: 4,
    text: "MP를 2 얻습니다. 추가로 MP 1을 지불해 점괘를 수행할 수 있습니다.",
  },
  HacKClaD_Luna_Delta_Cards_SoaringHeights: {
    name: "Soaring Heights",
    type: "Support",
    mp: 0,
    vp: 4,
    text: "점괘를 수행합니다. 클래드 인접한 빈 칸으로 이동할 수 있습니다.",
  },
  HacKClaD_Luna_Delta_Cards_Invocation: {
    name: "Invocation",
    type: "Support",
    mp: 1,
    vp: 4,
    text: "버린 패에서 지원/지원 마법 카드 1장을 손으로 되돌립니다. 이번 턴 다음 공격/공격 마법 카드가 ATK +1을 얻습니다.",
  },
};

function playerCardImage(code: string) {
  const match = Object.entries(PLAYER_CARD_IMAGES).find(([k]) => k.endsWith(`/${code}.webp`) || k.endsWith(`/${code}.png`));
  return match ? (match[1] as string) : "";
}

function playerCardDetail(code: string) {
  return PLAYER_CARD_DETAILS[code];
}

function isReactionCard(detail?: PlayerCardDetail | null) {
  return (detail?.type ?? "").toLowerCase().includes("reaction");
}

function parseRangeOffsets(detail?: PlayerCardDetail | null): Vec2[] {
  const source = detail?.atk ?? detail?.text ?? "";
  const regex = /\((-?\d+)\s*,\s*(-?\d+)\)/g;
  const res: Vec2[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(source))) {
    res.push({ x: Number(m[1]), y: Number(m[2]) });
  }
  // fallback to adjacent forward
  return res.length > 0 ? res : [{ x: 0, y: 1 }];
}

function isMoveSupportCard(detail?: PlayerCardDetail | null) {
  if (!detail) return false;
  const type = (detail.type ?? "").toLowerCase();
  if (!type.includes("support")) return false;
  const text = (detail.text ?? "").toLowerCase();
  // exclude cards that only mention "did not move" style clauses
  if (text.includes("이동하지 않았다") || text.includes("did not move")) return false;
  const name = (detail.name ?? "").toLowerCase();
  return name.includes("move") || text.includes("이동") || text.includes("move");
}

function rotateOffset(offset: Vec2, facing: Facing): Vec2 {
  const { x, y } = offset;
  if (facing === "N") return { x, y };
  if (facing === "E") return { x: y, y: -x };
  if (facing === "S") return { x: -x, y: -y };
  return { x: -y, y: x }; // W
}

// Wrap a coordinate into the 5x5 board centered at (0,0)
function wrapCoord(v: number, size = 5) {
  const half = Math.floor(size / 2);
  return ((((v + half) % size) + size) % size) - half;
}

function wrapPosition(pos: Vec2, size = 5): Vec2 {
  return { x: wrapCoord(pos.x, size), y: wrapCoord(pos.y, size) };
}

function neighborPosition(pos: Vec2, dir: Facing): Vec2 {
  const delta =
    dir === "N" ? { x: 0, y: 1 } : dir === "S" ? { x: 0, y: -1 } : dir === "E" ? { x: 1, y: 0 } : { x: -1, y: 0 };
  return wrapPosition({ x: pos.x + delta.x, y: pos.y + delta.y });
}

function computeMoveTargets(pos?: Vec2 | null): Array<{ dir: Facing; pos: Vec2 }> {
  if (!pos) return [];
  const dirs: Facing[] = ["N", "E", "S", "W"];
  return dirs.map((d) => ({ dir: d, pos: neighborPosition(pos, d) }));
}

function directionForTarget(current: Vec2, target: Vec2): Facing | null {
  const options: Array<{ dir: Facing; pos: Vec2 }> = computeMoveTargets(current);
  const match = options.find((o) => o.pos.x === target.x && o.pos.y === target.y);
  return match?.dir ?? null;
}

function buildAttackOptions(pos: Vec2, offsets: Vec2[]) {
  const dirs: Facing[] = ["N", "E", "S", "W"];
  return dirs.map((dir) => ({
    dir,
    targets: offsets
      .map((o) => rotateOffset(o, dir))
      .map((o) => ({
        x: wrapCoord(pos.x + o.x),
        y: wrapCoord(pos.y + o.y),
      })),
  }));
}

function shardKey(pos: Vec2) {
  return `${pos.x},${pos.y}`;
}

function turnFacing(current: Facing, dir: "left" | "right"): Facing {
  if (dir === "left") {
    if (current === "N") return "W";
    if (current === "W") return "S";
    if (current === "S") return "E";
    return "N";
  }
  if (current === "N") return "E";
  if (current === "E") return "S";
  if (current === "S") return "W";
  return "N";
}

function facingToDeg(facing?: Facing) {
  if (facing === "E") return 90;
  if (facing === "S") return 180;
  if (facing === "W") return -90;
  return 0;
}

function northBadgeOffset(facing?: Facing) {
  const offsets: Record<Facing, { x: number; y: number }> = {
    N: { x: 0, y: -18 },
    E: { x: 18, y: 0 },
    S: { x: 0, y: 18 },
    W: { x: -18, y: 0 },
  };
  return offsets[facing ?? "N"];
}

type GameState = {
  roomId?: string;
  mode: "pvp";
  round: number;
  phase: "forecast" | "draw" | "draft" | "action" | "scoring";
  voltage?: number;
  boss: {
    name?: string;
    hp: number;
    foresight: string[];
    voltage?: number;
    position?: { x: number; y: number };
    facing?: Facing;
  };
  shardsOnBoard?: Record<string, number>;
  actionQueue?: ActionQueueEntry[];
  actionIndex?: number;
  currentTurn?: { type: "player"; userId: string } | { type: "boss"; cardIndex: number; cardCode: string } | null;
  reaction?: { active: string; eligible?: string[]; passed?: string[]; context?: { type: string } } | null;
  legions?: Array<{ type: "head" | "tail"; position: Vec2; facing?: Facing; hp?: number }>;
  players: Array<{
    userId: string;
    nickname: string;
    characterId?: string;
    characterCode?: string | null;
    characterImageUrl?: string | null;
    needsEnhancedPick?: boolean;
    enhancedOptions?: string[];
    vp: number;
    injury: number;
    mp: number;
    cp: number;
    corruption?: number;
    hand: string[];
    deck: string[];
    discard: string[];
    conibearTraps?: boolean[];
    actedThisRound: boolean;
    standbySlot?: number;
    position?: { x: number; y: number } | null;
    facing?: Facing | null;
    ready?: boolean;
    chosenSlot?: number;
  }>;
  finished?: boolean;
  finalScores?: Array<{ userId: string; nickname: string; finalVp: number }>;
};

export default function GameRoom() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const ws = useMemo(() => new GameWS(), []);
  const [state, setState] = useState<GameState | null>(null);
  const [meId, setMeId] = useState<string>("");
  const [log, setLog] = useState<string>("");
  const [frontHandCard, setFrontHandCard] = useState<string | null>(null);
  const [pendingEnhancedPick, setPendingEnhancedPick] = useState<string | null>(null);
  const [pendingTurnSlotCard, setPendingTurnSlotCard] = useState<{ slot: 1 | 2 | 3 | 4; spawn?: { x: number; y: number } } | null>(null);
  const [slot3ReturnPrompt, setSlot3ReturnPrompt] = useState<{
    turnCardCode: string;
    spawn?: { x: number; y: number } | null;
    selected?: string | null;
  } | null>(null);
  const [slot4MovePrompt, setSlot4MovePrompt] = useState<{
    turnCardCode: string;
    spawn?: { x: number; y: number } | null;
    selected?: Vec2 | null;
  } | null>(null);
  const [substitutePrompt, setSubstitutePrompt] = useState<{ cardCode: string; targets: Vec2[] } | null>(null);
  const [showDeckPreview, setShowDeckPreview] = useState(false);
  const [showDiscardPreview, setShowDiscardPreview] = useState(false);
  const [showDeckDetail, setShowDeckDetail] = useState(false);
  const [showDiscardDetail, setShowDiscardDetail] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<{ choiceId: string; prompt: string } | null>(null);
  const [basicActionModal, setBasicActionModal] = useState<{
    action: "mp" | "dmgReduce";
    discard?: string | null;
  } | null>(null);
  const [selectedTurnSlotCard, setSelectedTurnSlotCard] = useState<string | null>(null);
  const [moveFlow, setMoveFlow] = useState<{
    stage: "idle" | "selectCard" | "chooseTile";
    selectedCard?: string | null;
    targets?: Array<{ dir: Facing; pos: Vec2 }>;
  }>({ stage: "idle", selectedCard: null, targets: [] });
  const [crackMovePrompt, setCrackMovePrompt] = useState<{ targets: Array<{ dir: Facing; pos: Vec2 }> } | null>(null);
  const [moveCardPrompt, setMoveCardPrompt] = useState<{ cardCode: string; targets: Array<{ dir: Facing; pos: Vec2 }> } | null>(null);
  const [trapAttackPrompt, setTrapAttackPrompt] = useState<{ targets: Vec2[] } | null>(null);
  const [cpActionModal, setCpActionModal] = useState<{ actionId: "guard" | "move" | "mp" | "draw"; dir?: Facing | null } | null>(null);
  const [attackOptions, setAttackOptions] = useState<Array<{ dir: Facing; targets: Vec2[] }>>([]);
  const [attackSelect, setAttackSelect] = useState<{ cardCode: string; options: Array<{ dir: Facing; targets: Vec2[] }> } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      nav("/login");
      return;
    }
    if (!roomId) {
      nav("/lobby");
      return;
    }

    ws.connect(token, (msg: any) => {
      if (msg.type === "auth:ok") {
        setMeId(msg.user.id);
        setLog(`auth ok: ${msg.user.nickname}`);
        ws.send({ type: "game:subscribe", roomId });
        ws.send({ type: "pvp:ready", roomId });
        return;
      }

      if (msg.type === "game:state") {
        console.log(
          "[state] players positions",
          (msg.state?.players ?? []).map((p: any) => ({ id: p.userId, pos: p.position, facing: p.facing }))
        );
        setState(msg.state);
        return;
      }

      if (msg.type === "game:choose") {
        setPendingChoice({ choiceId: msg.choiceId, prompt: msg.prompt ?? "선택하세요" });
        return;
      }

      if (msg.type === "error") {
        setLog(`error: ${msg.error}`);
        return;
      }

      if (msg.type === "ws:closed") {
        setLog("ws closed");
      }
    });

    return () => {
      // 개발 환경에서 StrictMode로 두 번 호출되는 것을 막기 위해 close는 생략
      // ws.close();
    };
  }, [nav, roomId, ws]);

  const canAct = state?.phase === "action" && !state?.finished;
  const myTurn = canAct && state?.currentTurn?.type === "player" && state.currentTurn.userId === meId;
  const reactionTurn = canAct && state?.reaction?.active === meId;
  const me = state?.players.find((p) => p.userId === meId);
  const miaTraps =
    (me?.conibearTraps ?? []).length > 0
      ? (me?.conibearTraps ?? []).map((t) => t === true)
      : [false, false];
  const hasFaceUpTrap = miaTraps.some((t) => t);
  const isMia = me?.characterCode === "CH_MIA_DELTA";
  const nextSlotChooser = useMemo(() => {
    if (!state || state.phase !== "draft") return null;
    const unchosen = state.players.filter((p) => typeof p.chosenSlot !== "number");
    if (unchosen.length === 0) return null;
    const nextStandby = Math.min(...unchosen.map((p) => p.standbySlot ?? 99));
    return unchosen.find((p) => (p.standbySlot ?? 99) === nextStandby) ?? null;
  }, [state]);
  const meNeedsEnhanced = !!state?.players.find((p) => p.userId === meId && p.needsEnhancedPick);
  const meEnhancedOptions = state?.players.find((p) => p.userId === meId)?.enhancedOptions ?? [];

  const bossVoltage = state?.boss.voltage ?? state?.voltage;
  const bossActionCards = state?.boss.foresight.length
    ? state.boss.foresight.map((code) => getCladCard(code) ?? { code, name: code, voltage: 0, actions: [] })
    : [];
  const bossFacing = state?.boss.facing;
  const bossPosition = state?.boss.position;
  const shardsOnBoard = state?.shardsOnBoard ?? {};
  const actionQueue: ActionQueueEntry[] = state?.actionQueue ?? [];
  const actionIndex = state?.actionIndex ?? 0;
  const boardCells = useMemo(
    () =>
      Array.from({ length: 25 }, (_, idx) => {
        const row = Math.floor(idx / 5);
        const col = idx % 5;
        return { x: col - 2, y: 2 - row };
      }),
    []
  );
  const cladPosition = wrapPosition(bossPosition ?? { x: 0, y: 0 });
  const cladFacing = bossFacing;
  const cladRotationDeg = facingToDeg(cladFacing);
  const cladNorthOffset = northBadgeOffset(cladFacing);
  const isFlare = me?.characterCode === "CH_FLARE_DELTA";
  const isCellOccupied = (cell: Vec2) => {
    const wrapped = wrapPosition(cell);
    if (wrapped.x === cladPosition.x && wrapped.y === cladPosition.y) return true;
    if ((state?.legions ?? []).some((l) => wrapPosition(l.position).x === wrapped.x && wrapPosition(l.position).y === wrapped.y)) {
      return true;
    }
    return (state?.players ?? []).some((p) => {
      if (!p.position) return false;
      const pos = wrapPosition(p.position);
      return pos.x === wrapped.x && pos.y === wrapped.y;
    });
  };
  const cpActionOptions = [
    { id: "guard", title: "1CP: 피해 -1", desc: "리액션 전용", cost: 1, timing: "reaction" as const, needsDir: false },
    { id: "move", title: "2CP: 1칸 이동", desc: "지원", cost: 2, timing: "turn" as const, needsDir: true },
    { id: "mp", title: "2CP: MP +1", desc: "지원", cost: 2, timing: "turn" as const, needsDir: false },
    { id: "draw", title: "4CP: 카드 1장 드로우", desc: "지원", cost: 4, timing: "turn" as const, needsDir: false },
  ];

  // ✅ FIX: currentTurn을 지역 변수로 빼서 TS narrowing이 확실히 되게 함
  const currentTurn = state?.currentTurn;
  const currentTurnLabel = !currentTurn
    ? "대기"
    : currentTurn.type === "player"
      ? `Player: ${state?.players.find((p) => p.userId === currentTurn.userId)?.nickname ?? ""}`
      : `Clad Card ${currentTurn.cardIndex + 1}`;

  const [inspectCard, setInspectCard] = useState<{
    code: string;
    type: "boss" | "player";
    title?: string;
    voltage?: number;
  } | null>(null);
  const [showSpawnPicker, setShowSpawnPicker] = useState<{ slot: 1 | 2 | 3 | 4; turnCardCode?: string } | null>(null);
  const [showTurnCardPicker, setShowTurnCardPicker] = useState<{ slot: 1 | 2 | 3 | 4; spawn?: { x: number; y: number } } | null>(null); // legacy picker (unused)

  const inspectCardDetail = inspectCard?.type === "player" ? playerCardDetail(inspectCard.code) : null;
  const inspectCardNeedsDirection =
    inspectCard?.type === "player" && (inspectCardDetail?.type ?? "").toLowerCase().includes("attack");

  useEffect(() => {
    if (!inspectCard) {
      setFrontHandCard(null);
    }
  }, [inspectCard]);

  function canPlayCard(code: string) {
    const detail = playerCardDetail(code);
    const costMp = detail?.mp ?? 0;
    const hasMp = (me?.mp ?? 0) >= costMp;
    const reactionCard = isReactionCard(detail);
    const actionTurn = myTurn && !state?.reaction;
    return hasMp && ((reactionCard && reactionTurn) || (!reactionCard && actionTurn));
  }

  useEffect(() => {
    if (inspectCard?.type === "player") {
      const detail = playerCardDetail(inspectCard.code);
      const pos = me?.position;
      if (inspectCardNeedsDirection && pos) {
        const offsets = parseRangeOffsets(detail);
        const options = buildAttackOptions(pos, offsets);
        setAttackOptions(options);
        return;
      }
    }
    setAttackOptions([]);
  }, [inspectCard, inspectCardNeedsDirection, me?.position]);

  useEffect(() => {
    // keep attack selection alive after pressing 발동; only clear when no directional card is in focus and nothing is being selected
    if (!inspectCardNeedsDirection && !attackSelect) {
      setAttackSelect(null);
    }
  }, [inspectCardNeedsDirection, attackSelect]);

  useEffect(() => {
    if (!myTurn) {
      setAttackSelect(null);
    }
  }, [myTurn]);

  useEffect(() => {
    if (!reactionTurn) {
      setSubstitutePrompt(null);
    }
  }, [reactionTurn]);

  useEffect(() => {
    if (!myTurn && moveFlow.stage !== "idle") {
      resetMoveFlow();
    }
    if (!myTurn) {
      setCrackMovePrompt(null);
      setMoveCardPrompt(null);
      setTrapAttackPrompt(null);
    }
  }, [myTurn, moveFlow.stage]);

  function playCard(code: string, dir?: Facing, opts?: { skipMovePrompt?: boolean }) {
    if (!roomId) return;
    const detail = playerCardDetail(code);
    const reactionCard = isReactionCard(detail);
    const actionTurn = myTurn && !state?.reaction;

    if (actionTurn && !opts?.skipMovePrompt && isMoveSupportCard(detail) && me?.position) {
      const targets = computeMoveTargets(me.position);
      if (targets.length > 0) {
        setMoveCardPrompt({ cardCode: code, targets });
        setInspectCard(null);
        setFrontHandCard(code);
        return;
      }
    }

    if (reactionTurn) {
      if (!reactionCard) {
        setLog((prev) => `리액션 턴에는 리액션 카드만 사용할 수 있습니다.\n${prev ?? ""}`);
        return;
      }
      if (code === "HacKClaD_Mia_Delta_Cards_Substitute") {
        const targets = boardCells.filter((cell) => !isCellOccupied(cell));
        if (targets.length === 0) {
          setLog((prev) => `이동할 수 있는 칸이 없습니다.\n${prev ?? ""}`);
          return;
        }
        setSubstitutePrompt({ cardCode: code, targets });
        setInspectCard(null);
        setFrontHandCard(code);
        return;
      }
      const payload: any = { type: "pvp:react", roomId, kind: "playCard", payload: { cardCode: code } };
      if (dir) {
        payload.payload.dir = dir;
      }
      ws.send(payload);
      return;
    }

    if (!actionTurn) {
      setLog((prev) => `지금은 카드를 낼 수 없습니다.\n${prev ?? ""}`);
      return;
    }

    const payload: any = { type: "pvp:playCard", roomId, cardCode: code };
    if (dir) {
      payload.dir = dir;
    }
    ws.send(payload);
  }

  function pickEnhanced(code: string) {
    if (!roomId) return;
    ws.send({ type: "pvp:pickEnhanced", roomId, cardCode: code });
  }

  function sendChoice(choiceId: string, value: any) {
    if (!roomId) return;
    ws.send({ type: "game:choice", roomId, choiceId, value });
    setPendingChoice(null);
  }

  function sendEnter(pos: Vec2) {
    if (!roomId) return;
    ws.send({ type: "pvp:enter", roomId, pos });
  }

  function useCrack() {
    if (!roomId) return;
    if (!me?.position) {
      setLog((prev) => `위치가 없어 크랙 스킬을 사용할 수 없습니다.\n${prev ?? ""}`);
      return;
    }
    const targets = computeMoveTargets(me.position);
    setCrackMovePrompt({ targets });
  }

  function sendCrack(moveTarget: Vec2 | null) {
    if (!roomId || !me || !me.position) return;
    const dir = moveTarget ? directionForTarget(me.position as Vec2, moveTarget) ?? me.facing ?? "N" : me.facing ?? "N";
    const payload = { dir, steps: moveTarget ? 1 : 0, moveTarget };
    if (reactionTurn) {
      ws.send({ type: "pvp:react", roomId, kind: "crack", payload });
    } else {
      ws.send({ type: "pvp:crack", roomId, ...payload });
    }
    setCrackMovePrompt(null);
  }

  function resetMoveFlow() {
    setMoveFlow({ stage: "idle", selectedCard: null, targets: [] });
  }

  function startMoveFlow() {
    if (!myTurn) {
      setLog((prev) => `내 턴이 아닙니다.\n${prev ?? ""}`);
      return;
    }
    if (!me || (me.hand?.length ?? 0) === 0) {
      setLog((prev) => `패가 없어 이동을 사용할 수 없습니다.\n${prev ?? ""}`);
      return;
  }
  setMoveFlow({ stage: "selectCard", selectedCard: null, targets: [] });
}

function confirmTurnSlotSelection() {
  if (!pendingTurnSlotCard || !selectedTurnSlotCard) return;
  const payloadSpawn = pendingTurnSlotCard.spawn ?? null;
    const slot = pendingTurnSlotCard.slot;
    setPendingTurnSlotCard(null);
    setSelectedTurnSlotCard(null);
    if (slot === 3) {
      const defaultReturn =
        (me?.hand ?? []).find((c) => c !== selectedTurnSlotCard) ?? (me?.hand ?? [])[0] ?? null;
      setSlot3ReturnPrompt({ turnCardCode: selectedTurnSlotCard, spawn: payloadSpawn, selected: defaultReturn });
      return;
    }
    if (slot === 4) {
      const origin = me?.position ?? payloadSpawn ?? null;
      const targets = origin ? computeMoveTargets(origin) : [];
      if (targets.length === 0) {
        chooseSlot(slot, selectedTurnSlotCard, payloadSpawn ?? undefined, null, null);
        return;
      }
      setSlot4MovePrompt({ turnCardCode: selectedTurnSlotCard, spawn: payloadSpawn, selected: null });
      return;
    }
    chooseSlot(slot, selectedTurnSlotCard, payloadSpawn ?? undefined);
  }

  function confirmMoveDiscard() {
    if (moveFlow.stage !== "selectCard" || !moveFlow.selectedCard) return;
    const targets = computeMoveTargets(me?.position);
    if (targets.length === 0) {
      setLog((prev) => `이동할 수 있는 칸이 없습니다.\n${prev ?? ""}`);
      resetMoveFlow();
      return;
    }
    setMoveFlow({ stage: "chooseTile", selectedCard: moveFlow.selectedCard, targets });
  }

  function handleMoveTargetClick(cell: Vec2) {
    if (moveFlow.stage !== "chooseTile" || !moveFlow.selectedCard) return;
    if (!roomId || !me?.position) return;
    const dir = directionForTarget(me.position, cell);
    if (!dir) return;
    sendBasicAction("move", moveFlow.selectedCard, dir);
    resetMoveFlow();
  }

  function handleMoveCardTargetClick(cell: Vec2) {
    if (!moveCardPrompt || !me?.position) return;
    const dir = directionForTarget(me.position, cell);
    if (!dir) return;
    playCard(moveCardPrompt.cardCode, dir, { skipMovePrompt: true });
    setMoveCardPrompt(null);
  }

  function handleCrackTargetClick(cell: Vec2) {
    if (!crackMovePrompt || !me?.position) return;
    const dir = directionForTarget(me.position, cell);
    if (!dir) return;
    sendCrack(cell);
  }

  function sendBasicAction(action: "move" | "mp" | "dmgReduce", discardCard?: string | null, dir?: Facing) {
    if (!roomId) return;
    const payload: any = { action, discardCard: discardCard ?? undefined, dir };
    if (reactionTurn) {
      ws.send({ type: "pvp:react", roomId, kind: "basicAction", payload });
    } else {
      ws.send({ type: "pvp:basicAction", roomId, ...payload });
    }
  }

  function openBasicAction(action: "move" | "mp" | "dmgReduce") {
    if (action === "move") {
      startMoveFlow();
      return;
    }
    if (action === "mp" && !myTurn) {
      setLog((prev) => `내 턴에만 MP 충전을 사용할 수 있습니다.\n${prev ?? ""}`);
      return;
    }
    const canUseDmgReduce = reactionTurn || myTurn;
    if (action === "dmgReduce" && !canUseDmgReduce) {
      setLog((prev) => `리액션 혹은 내 턴에만 -1 DMG를 사용할 수 있습니다.\n${prev ?? ""}`);
      return;
    }
    if (!me || (me.hand?.length ?? 0) === 0) {
      setLog((prev) => `패가 없어 사용할 수 없습니다.\n${prev ?? ""}`);
      return;
    }
    const defaultDiscard = me.hand[0] ?? null;
    setBasicActionModal({
      action,
      discard: defaultDiscard,
    });
  }

  function performBasicAction() {
    if (!roomId || !basicActionModal) return;
    if (!basicActionModal.discard) {
      setLog((prev) => `버릴 카드를 선택하세요.\n${prev ?? ""}`);
      return;
    }
    sendBasicAction(basicActionModal.action, basicActionModal.discard);
    setBasicActionModal(null);
  }

  function sendReactionPass() {
    if (!roomId || !reactionTurn) return;
    ws.send({ type: "pvp:react", roomId, kind: "pass" });
  }

  function sendCpAction(actionId: "guard" | "move" | "mp" | "draw", dir?: Facing) {
    if (!roomId) return;
    if (reactionTurn) {
      ws.send({ type: "pvp:react", roomId, kind: "cpAction", payload: { actionId, dir } });
    } else {
      ws.send({ type: "pvp:cpAction", roomId, actionId, dir });
    }
  }

  function sendMiaTrapAttack(target: { kind: "boss" | "legion"; pos?: Vec2 }) {
    if (!roomId) return;
    ws.send({ type: "pvp:miaTrapAttack", roomId, target });
  }

  function endTurn() {
    if (!roomId) return;
    ws.send({ type: "pvp:endTurn", roomId });
  }

  function chooseSpawnAndSlot(slot: 1 | 2 | 3 | 4, spawn: { x: number; y: number }) {
    if (!roomId) return;
    ws.send({ type: "pvp:chooseSlot", roomId, slot, spawn });
    setShowSpawnPicker(null);
  }

  function advancePhase() {
    if (!roomId) return;
    ws.send({ type: "pvp:advancePhase", roomId });
  }

  const closeInspect = () => {
    setInspectCard(null);
    setFrontHandCard(null);
  };

  useEffect(() => {
    if (!pendingTurnSlotCard) {
      setSelectedTurnSlotCard(null);
    }
  }, [pendingTurnSlotCard]);
  function chooseSlot(
    slot: 1 | 2 | 3 | 4,
    turnCardCode: string,
    spawn?: { x: number; y: number } | null,
    returnCardCode?: string | null,
    moveTarget?: Vec2 | null
  ) {
    if (!roomId) return;
    ws.send({
      type: "pvp:chooseSlot",
      roomId,
      slot,
      turnCardCode,
      spawn,
      returnCardCode: returnCardCode ?? null,
      moveTarget: moveTarget ?? null,
    });
    setSlot3ReturnPrompt(null);
    setSlot4MovePrompt(null);
    setPendingTurnSlotCard(null);
    setSelectedTurnSlotCard(null);
  }

  function confirmSlot3Return() {
    if (!slot3ReturnPrompt) return;
    if (!slot3ReturnPrompt.selected) {
      setLog((prev) => `덱으로 돌릴 카드를 선택하세요.\n${prev ?? ""}`);
      return;
    }
    chooseSlot(3, slot3ReturnPrompt.turnCardCode, slot3ReturnPrompt.spawn ?? undefined, slot3ReturnPrompt.selected, null);
  }

  function finalizeSlot4Move(target: Vec2 | null) {
    if (!slot4MovePrompt) return;
    chooseSlot(4, slot4MovePrompt.turnCardCode, slot4MovePrompt.spawn ?? undefined, null, target);
  }

  function handleSlot4MoveClick(cell: Vec2) {
    if (!slot4MovePrompt) return;
    const origin = me?.position ?? slot4MovePrompt.spawn;
    if (!origin) return;
    const dir = directionForTarget(origin, cell);
    if (!dir) return;
    finalizeSlot4Move(cell);
  }

  const showDraftOverlay = state?.phase === "draft" && !slot3ReturnPrompt && !slot4MovePrompt && !pendingTurnSlotCard;

  useEffect(() => {
    if (state?.phase !== "draft") {
      setSlot3ReturnPrompt(null);
      setSlot4MovePrompt(null);
      setPendingTurnSlotCard(null);
    }
  }, [state?.phase]);

  if (!state) {
    return (
      <div className="h-screen bg-slate-950 text-slate-50 flex items-center justify-center overflow-hidden">
        <div className="text-slate-400">게임 상태 불러오는 중... {log}</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#07030d] text-slate-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,0,153,0.18)_0%,_rgba(0,0,0,0.6)_45%,_rgba(0,0,0,0.95)_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(255,255,255,0.05),_transparent_40%),radial-gradient(circle_at_70%_80%,_rgba(255,118,255,0.08),_transparent_50%)]" />
      <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col px-3 py-4 sm:px-6 relative">
        {showDraftOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="pointer-events-none absolute inset-0 z-0 bg-black/40 backdrop-blur-[2px]" />
            <div className="relative z-10 w-full max-w-[780px] rounded-3xl border border-white/20 bg-slate-900/90 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between text-sm font-semibold text-white">
                <span>턴 슬롯 선택</span>
                <span className="text-[11px] text-amber-200">드래프트 단계 전용</span>
              </div>
              {nextSlotChooser && (
                <div className="mt-1 text-[12px] text-amber-200">
                  지금 선택할 차례: {nextSlotChooser.nickname ?? nextSlotChooser.userId}
                </div>
              )}
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {[1, 2, 3, 4].map((slot) => {
                  const takenBy = state.players.find((p) => p.chosenSlot === slot);
                  const mine = me && me.chosenSlot === slot;
                  const disabled =
                    Boolean(takenBy && !mine) ||
                    !nextSlotChooser ||
                    (nextSlotChooser && nextSlotChooser.userId !== meId);
                  return (
                    <button
                      key={slot}
                      className={`rounded-xl border px-3 py-3 text-left text-sm ${
                        mine
                          ? "border-amber-400/70 bg-amber-500/15 text-amber-100"
                          : "border-white/10 bg-slate-800/80 text-slate-100 hover:border-amber-300/40"
                      } disabled:opacity-50`}
                      onClick={() => {
                        setSlot3ReturnPrompt(null);
                        setSlot4MovePrompt(null);
                        setSelectedTurnSlotCard(null);
                        if (!me?.position) {
                          setShowSpawnPicker({ slot: slot as 1 | 2 | 3 | 4 });
                        } else {
                          setPendingTurnSlotCard({ slot: slot as 1 | 2 | 3 | 4, spawn: me.position ?? null });
                        }
                      }}
                      disabled={disabled}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Slot {slot}</span>
                        {mine && <span className="text-[11px] text-amber-200">내 슬롯</span>}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-300">
                        {slot === 1 && "즉시 드로우 1"}
                        {slot === 2 && "MP +1"}
                        {slot === 3 && "드로우 1 후 1장 덱으로"}
                        {slot === 4 && "0~1칸 이동"}
                      </div>
                      {takenBy && !mine && <div className="mt-2 text-[11px] text-slate-400">선택: {takenBy.nickname}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <div className="mt-3 grid flex-1 min-h-0 gap-3 xl:grid-cols-[340px_1fr_320px]">
          {/* 좌측: 캐릭터 상태 패널 */}
          <button className="hidden" onClick={advancePhase} aria-label="advance phase debug" />
          <aside className="rounded-3xl border border-white/12 bg-white/5 p-4 space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm h-full overflow-y-auto">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>파티</span>
              <button
                className="rounded-full border border-pink-400/40 bg-gradient-to-r from-pink-600/70 to-purple-700/70 px-3 py-1 text-[11px] text-white shadow-[0_0_12px_rgba(255,0,153,0.35)] hover:shadow-[0_0_16px_rgba(255,0,153,0.45)]"
                onClick={() => nav("/lobby")}
              >
                방 나가기
              </button>
            </div>
            <div className="text-[11px] text-slate-200 space-y-1">
              <div className="flex flex-wrap gap-2">
                {bossActionCards.slice(0, 3).map((c, i) => {
                  const isCurrent = currentTurn?.type === "boss" && currentTurn.cardIndex === i;
                  return (
                    <div
                      key={`clad-seq-${i}`}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1 ${isCurrent ? "border-amber-300 bg-amber-500/20" : "border-white/15 bg-white/5"}`}
                    >
                      <span className="text-[10px] text-slate-300">클래드 {i + 1}</span>
                      {cardImage(c.code) ? (
                        <img src={cardImage(c.code)} alt={c.name} className="h-10 w-8 rounded-[6px] object-cover border border-white/20" />
                      ) : (
                        <div className="h-10 w-8 rounded-[6px] bg-slate-800 border border-white/20" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((s) => {
                  const pl = state.players.find((p) => p.chosenSlot === s);
                  const isCurrent = currentTurn?.type === "player" && currentTurn.userId === pl?.userId;
                  return (
                    <span
                      key={`slot-seq-${s}`}
                      className={`rounded-md border px-2 py-1 ${isCurrent ? "border-amber-300 bg-amber-500/20 text-amber-100" : "border-white/15 bg-white/5"}`}
                    >
                      턴 {s}: {pl?.nickname ?? "-"}
                    </span>
                  );
                })}
              </div>
            </div>
            {state.players.map((p) => {
              const isMe = p.userId === meId;
              return (
                <div
                  key={p.userId}
                  className={`rounded-2xl border bg-black/30 p-3 flex items-start gap-3 shadow-[0_6px_18px_rgba(0,0,0,0.3)] ${
                    isMe ? "border-emerald-300/60 ring-2 ring-emerald-200/30" : "border-white/12"
                  } ${isMe ? "bg-gradient-to-r from-cyan-500/10 via-black/30 to-black/20" : ""}`}
                >
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-amber-500/40 to-rose-500/40 border border-white/10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold truncate">{p.nickname}</div>
                      {isMe && (
                        <span className="rounded-full border border-cyan-200/50 bg-cyan-500/10 px-2 py-[2px] text-[11px] text-cyan-100">
                          나
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400" />
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-200">
                      <StatBar label="MP" value={p.mp} max={15} color="from-sky-400 to-cyan-300" />
                      <StatBar label="CP" value={p.cp} max={10} color="from-blue-400 to-indigo-300" />
                      <StatBar label="VP" value={p.vp} max={30} color="from-amber-400 to-orange-300" />
                      <StatBar label="부패" value={p.corruption ?? 0} max={10} color="from-purple-400 to-pink-300" />
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">부상</span>
                          <span className="text-[10px] font-semibold text-rose-200">{p.injury}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full w-full rounded-full bg-gradient-to-r from-rose-400 to-rose-300" style={{ width: "100%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </aside>

          {/* 중앙: 보드 + 핸드 */}
          <main className="relative flex h-full min-h-0 flex-col gap-3 overflow-hidden">
            <div className="relative flex-1 min-h-0 mx-auto w-full max-w-[600px]">
              <div
                className="relative mx-auto max-w-[500px] rounded-[30px] border border-white/15 px-5 py-5 shadow-[0_0_40px_rgba(0,0,0,0.35)] overflow-hidden"
                style={{ backgroundImage: `url(${BOARD_BG})`, backgroundSize: "cover", backgroundPosition: "center" }}
              >
                  <div className="grid grid-cols-5 gap-[10px]">
                    {boardCells.map((cell, idx) => {
                      const attackTargets = (attackSelect?.options ?? attackOptions).flatMap((o) => o.targets);
                      const moveTarget =
                        moveFlow.stage === "chooseTile" &&
                        (moveFlow.targets ?? []).some((t) => t.pos.x === cell.x && t.pos.y === cell.y);
                      const moveCardTarget =
                        moveCardPrompt && (moveCardPrompt.targets ?? []).some((t) => t.pos.x === cell.x && t.pos.y === cell.y);
                      const attackTarget = attackTargets.some((t) => wrapPosition(t).x === cell.x && wrapPosition(t).y === cell.y);
                      const trapTarget =
                        trapAttackPrompt &&
                        (trapAttackPrompt.targets ?? []).some((t) => wrapPosition(t).x === cell.x && wrapPosition(t).y === cell.y);
                      const substituteTarget =
                        substitutePrompt &&
                        (substitutePrompt.targets ?? []).some((t) => wrapPosition(t).x === cell.x && wrapPosition(t).y === cell.y);
                      const entryTarget =
                        myTurn && !me?.position && entryPoints(state, meId).some((t) => t.x === cell.x && t.y === cell.y);
                      const slot4Targets = slot4MovePrompt ? computeMoveTargets(slot4MovePrompt.spawn ?? me?.position ?? undefined) : [];
                      const slot4Target =
                        slot4MovePrompt && slot4Targets.some((t) => t.pos.x === cell.x && t.pos.y === cell.y);
                      const crackTarget =
                        crackMovePrompt && (crackMovePrompt.targets ?? []).some((t) => t.pos.x === cell.x && t.pos.y === cell.y);
                      const isCladHere = cell.x === cladPosition.x && cell.y === cladPosition.y;
                      const legionsHere = (state.legions ?? []).filter(
                        (l) => wrapPosition(l.position).x === cell.x && wrapPosition(l.position).y === cell.y
                      );
                      const shardAmt = shardsOnBoard[shardKey(cell)] ?? 0;
                      const playersHere = state.players
                        .filter((p) => p.position)
                        .filter((p) => {
                          const wrapped = wrapPosition(p.position as Vec2);
                          return wrapped.x === cell.x && wrapped.y === cell.y;
                        });
                      return (
                        <div
                          key={idx}
                          className={`relative aspect-square rounded-[12px] border border-white/20 bg-black/25 backdrop-blur-[1px] shadow-[inset_0_0_12px_rgba(0,0,0,0.35)] flex items-center justify-center overflow-hidden ${
                            moveTarget || slot4Target || crackTarget || moveCardTarget || attackTarget || trapTarget || substituteTarget || entryTarget
                              ? "cursor-pointer ring-2 ring-amber-300/70"
                              : ""
                          }`}
                          onClick={() => {
                            if (substitutePrompt) {
                              if (substituteTarget && roomId) {
                                ws.send({
                                  type: "pvp:react",
                                  roomId,
                                  kind: "playCard",
                                  payload: { cardCode: substitutePrompt.cardCode, target: cell }
                                });
                                setSubstitutePrompt(null);
                                return;
                              }
                            }
                            if (trapAttackPrompt) {
                              if (isCladHere) {
                                sendMiaTrapAttack({ kind: "boss" });
                                setTrapAttackPrompt(null);
                                return;
                              }
                              if (legionsHere.length > 0) {
                                sendMiaTrapAttack({ kind: "legion", pos: cell });
                                setTrapAttackPrompt(null);
                                return;
                              }
                            }
                            if (attackSelect) {
                              const match = attackSelect.options.find((opt) =>
                                opt.targets.some((t) => wrapPosition(t).x === cell.x && wrapPosition(t).y === cell.y)
                              );
                              if (match) {
                                playCard(attackSelect.cardCode, match.dir);
                                setAttackSelect(null);
                              }
                              return;
                            }
                            if (entryTarget) {
                              sendEnter(cell);
                              return;
                            }
                            if (crackTarget) {
                              handleCrackTargetClick(cell);
                              return;
                            }
                            if (moveCardTarget) {
                              handleMoveCardTargetClick(cell);
                              return;
                            }
                            if (moveTarget) {
                              handleMoveTargetClick(cell);
                              return;
                            }
                            if (slot4Target) {
                              handleSlot4MoveClick(cell);
                            }
                          }}
                        >
                          {(moveTarget || slot4Target || crackTarget || attackTarget || trapTarget || substituteTarget || entryTarget) && (
                            <div className="absolute inset-0 bg-amber-300/15 backdrop-blur-[1px] pointer-events-none" />
                          )}
                          {shardAmt > 0 && (
                            <div className="pointer-events-none absolute inset-[20%] flex items-center justify-center">
                              <div className="relative h-10 w-10">
                                <div
                                  className="absolute inset-0 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700 opacity-90 shadow-[0_10px_20px_rgba(123,63,255,0.35)]"
                                  style={{
                                    clipPath:
                                      "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)"
                                  }}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] font-black text-white drop-shadow-[0_0_6px_rgba(0,0,0,0.45)]">
                                  <span className="leading-none">VP</span>
                                  <span className="text-sm leading-none">{shardAmt}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {legionsHere.map((l, i) => (
                            <div
                              key={`legion-${idx}-${i}`}
                              className="pointer-events-none absolute inset-[18%] rounded-[12px] border border-purple-300/45 bg-purple-200/25 flex items-center justify-center shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
                            >
                              {(l.type === "head" ? CLAD_REGION_ICON : CLAD_REGION_ICON_TAIL) ? (
                                <img
                                  src={l.type === "head" ? CLAD_REGION_ICON : CLAD_REGION_ICON_TAIL}
                                  alt={l.type === "head" ? "Hydra Head" : "Hydra Tail"}
                                  className="h-full w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
                                  style={{ transform: `rotate(${facingToDeg(l.facing)}deg)` }}
                                />
                              ) : (
                                <div className="h-full w-full rounded-[10px] bg-purple-400/40" />
                              )}
                            </div>
                          ))}
                          {playersHere.map((p, i) => {
                            const img = findCharImage(p.characterImageUrl, p.characterCode);
                            const offsetY = (i - (playersHere.length - 1) / 2) * 24;
                            const nicknameInitial = (p.nickname ?? p.userId ?? "?").slice(0, 1).toUpperCase();
                            const isMe = p.userId === meId;
                            return (
                              <div
                                key={`player-${p.userId}-${i}`}
                                className="pointer-events-none absolute left-1/2 top-1/2"
                                style={{ transform: `translate(-50%, -50%) translateY(${offsetY}px)` }}
                              >
                                <div
                                  className={`relative h-12 w-12 rounded-full border bg-slate-900/80 overflow-hidden shadow-[0_10px_20px_rgba(0,0,0,0.4)] ${
                                    isMe ? "border-emerald-300/80 ring-2 ring-emerald-300/60" : "border-amber-300/60"
                                  }`}
                                >
                                  {img ? (
                                    <img src={img} alt={p.nickname ?? p.userId} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-amber-100 bg-gradient-to-br from-slate-800 to-slate-900">
                                      {nicknameInitial}
                                    </div>
                                  )}
                                  {p.facing && (
                                    <div className="absolute -top-2 right-[-6px] rounded-full border border-amber-500/60 bg-black/80 px-2 py-[2px] text-[10px] font-semibold text-amber-100 shadow-[0_6px_12px_rgba(0,0,0,0.45)]">
                                      {p.facing}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {isCladHere && (
                            <div className="pointer-events-none absolute inset-[14%] rounded-[12px] border border-amber-500/60 bg-amber-200/60 flex items-center justify-center shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
                              {CLAD_ICON ? (
                                <img
                                  src={CLAD_ICON}
                                  alt="Clad"
                                  className="h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]"
                                  style={{ transform: `rotate(${cladRotationDeg}deg)` }}
                                />
                              ) : (
                                <div className="h-full w-full rounded-[10px] bg-amber-400/60" />
                              )}
                              {cladFacing && (
                                <div
                                  className="absolute left-1/2 top-1/2 rounded-full border border-amber-700/50 bg-black/70 px-2 py-[2px] text-[10px] font-semibold text-amber-100"
                                  style={{
                                    transform: `translate(-50%, -50%) translate(${cladNorthOffset.x}px, ${cladNorthOffset.y}px)`,
                                  }}
                                >
                                  N
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {inspectCard?.type === "player" && canPlayCard(inspectCard.code) && (
              <div className="pointer-events-none fixed inset-x-0 bottom-40 z-[300] flex justify-center">
                <div className="pointer-events-auto h-16 w-16 rounded-full border-2 border-amber-300 bg-amber-500/90 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(0,0,0,0.35)] flex items-center justify-center">
                  <button
                    className="h-full w-full rounded-full bg-black/10 text-white hover:bg-black/20"
                    onClick={() => {
                      if (inspectCardNeedsDirection) {
                        if (!me?.position) {
                          setLog((prev) => `위치가 없어 공격 방향을 선택할 수 없습니다.\n${prev ?? ""}`);
                          return;
                        }
                        if (attackOptions.length === 0) {
                          setLog((prev) => `공격 범위를 계산할 수 없습니다.\n${prev ?? ""}`);
                          return;
                        }
                        setAttackSelect({ cardCode: inspectCard.code, options: attackOptions });
                        setInspectCard(null);
                        return;
                      }
                      playCard(inspectCard.code);
                      closeInspect();
                    }}
                  >
                    발동
                  </button>
                </div>
              </div>
            )}
            {attackSelect && (
              <div className="fixed left-4 bottom-40 z-[300] rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 shadow-lg space-y-2">
                <div className="text-[11px] text-amber-200">보드의 하이라이트된 범위를 눌러 공격 방향을 정하세요.</div>
                <button
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                  onClick={() => {
                    setAttackSelect(null);
                  }}
                >
                  취소
                </button>
              </div>
            )}

            <div className="shrink-0">
            {moveFlow.stage !== "idle" && (
              <div className="fixed left-1/2 bottom-56 z-[400] -translate-x-1/2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200/50 bg-amber-500/15 px-4 py-3 text-sm text-amber-50 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                  <div className="font-semibold">
                    {moveFlow.stage === "selectCard" ? "이동: 버릴 카드를 선택하세요." : "이동: 목표 칸을 선택하세요."}
                    </div>
                    {moveFlow.selectedCard && (
                      <div className="text-[12px] text-amber-100">
                        선택된 카드: {playerCardDetail(moveFlow.selectedCard)?.name ?? moveFlow.selectedCard}
                      </div>
                    )}
                    {moveFlow.stage === "selectCard" && moveFlow.selectedCard && (
                      <button
                        className="rounded-lg border border-amber-200/60 bg-amber-500/25 px-3 py-1 text-sm font-semibold hover:bg-amber-500/35"
                        onClick={confirmMoveDiscard}
                      >
                        버리기
                      </button>
                    )}
                    <button
                      className="rounded-lg border border-white/25 bg-white/10 px-3 py-1 text-sm text-slate-100 hover:bg-white/15"
                      onClick={resetMoveFlow}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
            {myTurn && !me?.position && (
              <div className="fixed left-1/2 bottom-56 z-[400] -translate-x-1/2">
                <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200/50 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-50 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                  <div className="font-semibold">재진입: 표시된 입구 칸을 클릭하세요.</div>
                </div>
              </div>
            )}

              {crackMovePrompt && (
                <div className="fixed left-1/2 top-16 z-[360] -translate-x-1/2">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300/50 bg-slate-900/80 px-4 py-3 text-sm text-amber-50 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <div className="font-semibold">크랙: 0~1칸 이동할 칸을 선택하세요.</div>
                    <button
                      className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-sm text-slate-100 hover:bg-white/15"
                      onClick={() => sendCrack(null)}
                    >
                      이동 안 함
                    </button>
                    <button
                      className="rounded-lg border border-white/25 bg-white/10 px-3 py-1 text-sm text-slate-100 hover:bg-white/15"
                      onClick={() => setCrackMovePrompt(null)}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
              {moveCardPrompt && (
                <div className="fixed left-1/2 top-16 z-[360] -translate-x-1/2">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300/50 bg-slate-900/80 px-4 py-3 text-sm text-amber-50 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <div className="font-semibold">
                      이동 카드 사용: 이동할 칸을 선택하세요.
                    </div>
                    <button
                      className="rounded-lg border border-white/25 bg-white/10 px-3 py-1 text-sm text-slate-100 hover:bg-white/15"
                      onClick={() => setMoveCardPrompt(null)}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
              {trapAttackPrompt && (
                <div className="fixed left-1/2 top-16 z-[360] -translate-x-1/2">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300/50 bg-slate-900/80 px-4 py-3 text-sm text-amber-50 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <div className="font-semibold">코니베어 함정 공격: 대상 칸을 선택하세요.</div>
                    <button
                      className="rounded-lg border border-white/25 bg-white/10 px-3 py-1 text-sm text-slate-100 hover:bg-white/15"
                      onClick={() => setTrapAttackPrompt(null)}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
              {substitutePrompt && (
                <div className="fixed left-1/2 top-16 z-[360] -translate-x-1/2">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-amber-300/50 bg-slate-900/80 px-4 py-3 text-sm text-amber-50 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <div className="font-semibold">Substitute: 이동할 칸을 선택하세요.</div>
                    <button
                      className="rounded-lg border border-white/25 bg-white/10 px-3 py-1 text-sm text-slate-100 hover:bg-white/15"
                      onClick={() => setSubstitutePrompt(null)}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
              {me && (
                <div className="flex flex-nowrap justify-center gap-0">
                  {me.hand.map((code, idx) => {
                    const isMoveSelecting = moveFlow.stage !== "idle";
                    const isSelectedMoveCard = moveFlow.selectedCard === code;
                    const isPendingTurnCard = pendingTurnSlotCard && selectedTurnSlotCard === code;
                    const playable = canPlayCard(code);
                    const isFront = frontHandCard === code;
                    const overlap = idx === 0 ? 0 : -12;
                    const isInspecting = inspectCard?.type === "player" && inspectCard.code === code;
                    const baseZ = 120 + idx; // keep all hand cards above modal overlays
                    const z = isFront || isInspecting ? 280 : isSelectedMoveCard || isPendingTurnCard ? 230 : baseZ;
                    const borderClass = playable
                      ? "border-amber-300/80 shadow-[0_10px_28px_rgba(255,184,107,0.25)]"
                      : "border-sky-300/70 shadow-[0_8px_20px_rgba(125,200,255,0.2)]";
                    const moveOutline = isMoveSelecting
                      ? isSelectedMoveCard
                        ? "ring-2 ring-amber-200/70"
                        : "ring-1 ring-amber-200/30"
                      : "";
                    const pendingOutline =
                      pendingTurnSlotCard && selectedTurnSlotCard === code ? "ring-2 ring-amber-300/80" : "";
                    return (
                      <button
                        key={code + idx}
                        className={`group relative w-[140px] rounded-2xl border bg-gradient-to-br from-slate-900 to-slate-950 p-2 flex flex-col items-center transition-all duration-150 ease-out hover:-translate-y-2 ${borderClass} ${moveOutline} ${pendingOutline}`}
                        style={{ marginLeft: overlap, zIndex: z }}
                        onClick={() => {
                          if (pendingTurnSlotCard) {
                            const payloadSpawn = pendingTurnSlotCard.spawn ?? null;
                            const slot = pendingTurnSlotCard.slot;
                            setSelectedTurnSlotCard(code);
                            return;
                          }
                          if (slot3ReturnPrompt) {
                            const hasOther = (me?.hand ?? []).some((c, i) => c !== slot3ReturnPrompt.turnCardCode || i !== idx);
                            if (slot3ReturnPrompt.turnCardCode === code && hasOther) {
                              setLog((prev) => `턴 카드로 올린 카드는 덱으로 돌릴 수 없습니다.\n${prev ?? ""}`);
                              return;
                            }
                            setSlot3ReturnPrompt((prev) => (prev ? { ...prev, selected: code } : prev));
                            setInspectCard(null);
                            return;
                          }
                          if (isMoveSelecting) {
                            setMoveFlow((prev) => ({ ...prev, selectedCard: code }));
                            setInspectCard(null);
                            return;
                          }
                          if (basicActionModal) {
                            setBasicActionModal((prev) => (prev ? { ...prev, discard: code } : prev));
                            setInspectCard(null);
                            return;
                          }
                          setFrontHandCard(code);
                          setInspectCard({ code, type: "player" });
                        }}
                      >
                        {isSelectedMoveCard && (
                          <span className="pointer-events-none absolute left-3 top-3 rounded-md border border-amber-200/70 bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-100 shadow-sm">
                            이동 선택
                          </span>
                        )}
                        {playerCardImage(code) ? (
                          <div className="w-full aspect-[3/4] rounded-2xl border border-white/10 overflow-hidden bg-slate-900/80 shadow-[0_8px_18px_rgba(0,0,0,0.45)]">
                            <img src={playerCardImage(code)} alt={code} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full aspect-[3/4] rounded-2xl border border-white/10 overflow-hidden bg-slate-900/80 flex items-center justify-center text-xs text-slate-400">
                            이미지 없음
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {me.hand.length === 0 && <div className="text-slate-400">카드 없음</div>}
                </div>
              )}
            </div>
          </main>

          {/* 우측: 클래드 카드 프리뷰 + 액션 + 로그 */}
          <aside className="space-y-3 h-full overflow-y-auto">
            <div className="rounded-3xl border border-white/12 bg-white/5 p-3 shadow-[0_10px_26px_rgba(0,0,0,0.25)] backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>클래드 카드</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {bossActionCards.slice(0, 3).map((c, i) => (
                  <button
                    key={c.code + i}
                    className="rounded-xl border border-white/15 bg-slate-900/70 p-2 shadow-sm hover:border-white/30 hover:shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                    onClick={() => setInspectCard({ code: c.code, type: "boss", title: c.name, voltage: c.voltage })}
                  >
                    {cardImage(c.code) ? (
                      <img
                        src={cardImage(c.code)}
                        alt={c.name}
                        className="h-28 w-full rounded-lg object-cover border border-white/20 bg-white/5"
                      />
                    ) : (
                      <div className="h-28 w-full rounded-lg bg-white/10 border border-white/20" />
                    )}
                  </button>
                ))}
                {bossActionCards.length === 0 && <div className="col-span-3 text-[12px] text-slate-300">foresight 대기</div>}
              </div>
            </div>

            <div className="rounded-3xl border border-white/12 bg-white/5 p-4 space-y-2 shadow-[0_10px_26px_rgba(0,0,0,0.25)] backdrop-blur-sm">
              <div className="text-sm font-semibold">액션 패널</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: "이동", icon: ">", onClick: () => openBasicAction("move"), allowReaction: false },
                  { label: "MP 충전", icon: "+", onClick: () => openBasicAction("mp"), allowReaction: false },
                  { label: "-1 DMG", icon: "-", onClick: () => openBasicAction("dmgReduce"), allowReaction: true },
                  {
                    label: "CP 액션",
                    icon: "C",
                    onClick: () => setCpActionModal({ actionId: reactionTurn ? "guard" : "move", dir: null }),
                    allowReaction: true,
                  },
                  ...(isMia
                    ? [
                        {
                          label: "함정 공격",
                          icon: "T",
                          onClick: () => {
                            const bossPos = cladPosition;
                            const legionTargets = (state?.legions ?? []).map((l) => wrapPosition(l.position));
                            const targets = [bossPos, ...legionTargets];
                            if (targets.length === 0) {
                              setLog((prev) => `대상 없음: 함정 공격을 사용할 수 없습니다.\n${prev ?? ""}`);
                              return;
                            }
                            if (!hasFaceUpTrap) {
                              setLog((prev) => `앞면 코니베어 함정이 없습니다.\n${prev ?? ""}`);
                              return;
                            }
                            setTrapAttackPrompt({ targets });
                          },
                          allowReaction: false,
                          requiresTrap: true,
                        },
                      ]
                    : []),
                  { label: "크랙스킬", icon: "*", onClick: () => useCrack(), allowReaction: isFlare },
                  { label: "턴 종료", icon: "■", onClick: endTurn, allowReaction: true },
                ].map((a) => (
                  <button
                    key={a.label}
                    className="flex items-center gap-3 rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-left text-sm hover:border-amber-300/60 hover:bg-amber-500/10 hover:shadow-[0_6px_18px_rgba(255,184,107,0.2)] disabled:opacity-40"
                    onClick={a.onClick}
                    disabled={
                      a.requiresTrap
                        ? !(myTurn && !reactionTurn && hasFaceUpTrap)
                        : !(myTurn || (reactionTurn && a.allowReaction) || a.label === "턴 종료")
                    }
                  >
                    <span className="text-amber-200 text-base">{a.icon}</span>
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-400">일부 액션은 손패를 선택한 뒤에 확정됩니다.</div>
            </div>

            {isMia && (
              <div className="rounded-3xl border border-white/12 bg-white/5 p-4 space-y-3 shadow-[0_10px_26px_rgba(0,0,0,0.25)] backdrop-blur-sm">
                <div className="text-sm font-semibold">코니베어 함정</div>
                <div className="flex items-center gap-3">
                  {(miaTraps.length > 0 ? miaTraps : [false, false]).map((faceUp, idx) => (
                    <div
                      key={`trap-${idx}`}
                      className={`h-14 w-14 rounded-xl border border-white/15 bg-black/30 flex items-center justify-center ${
                        faceUp ? "ring-2 ring-amber-300/70" : ""
                      }`}
                    >
                      <img src={faceUp ? MIA_TRAP_FRONT : MIA_TRAP_BACK} alt="Conibear Trap" className="h-10 w-10 object-contain" />
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-slate-400">앞면 함정은 지원 행동으로 뒤집어 ATK 1 공격을 합니다.</div>
              </div>
            )}

            <div className="rounded-3xl border border-white/12 bg-white/5 p-4 space-y-3 shadow-[0_10px_26px_rgba(0,0,0,0.25)] backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>덱 / 버린 / 로그</span>
                <span className="text-[11px] text-slate-400">상호작용</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 hover:border-amber-300/40 hover:bg-slate-900"
                  onClick={() => {
                    setShowDeckPreview((v) => !v);
                    setShowDeckDetail(false);
                  }}
                >
                  덱 보기 ({me?.deck.length ?? 0})
                </button>
                <button
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 hover:border-amber-300/40 hover:bg-slate-900"
                  onClick={() => {
                    setShowDiscardPreview((v) => !v);
                    setShowDiscardDetail(false);
                  }}
                >
                  버린 ({me?.discard.length ?? 0})
                </button>
              </div>
              {showDeckPreview && (
                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-2 text-[11px] text-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>덱 상단 미리보기</span>
                    <button
                      className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/10"
                      onClick={() => setShowDeckDetail(true)}
                    >
                      자세히
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(me?.deck ?? []).slice(0, 5).map((c, i) => (
                      <span key={`${c}-${i}`} className="rounded-md border border-white/10 px-2 py-1">
                        {c}
                      </span>
                    ))}
                    {(me?.deck?.length ?? 0) === 0 && <span className="text-slate-400">카드 없음</span>}
                  </div>
                </div>
              )}
              {showDiscardPreview && (
                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-2 text-[11px] text-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>버린 카드 간단보기</span>
                    <button
                      className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/10"
                      onClick={() => setShowDiscardDetail(true)}
                    >
                      자세히
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(me?.discard ?? []).slice(0, 6).map((c, i) => (
                      <span key={`${c}-${i}`} className="rounded-md border border-white/10 px-2 py-1">
                        {c}
                      </span>
                    ))}
                    {(me?.discard?.length ?? 0) === 0 && <span className="text-slate-400">카드 없음</span>}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-2 h-32 overflow-y-auto text-[11px] text-slate-300">
                {log || "로그 없음"}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {inspectCard && (
        <div className="fixed inset-0 z-30" onClick={closeInspect} />
      )}

      {inspectCard && (
        <div className="fixed right-4 top-20 z-40 w-[380px] max-h-[80vh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900/90 p-4 shadow-2xl space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] text-slate-400">{inspectCard.type === "boss" ? "클래드 카드" : "플레이어 카드"}</div>
              <div className="text-lg font-bold text-white">{inspectCardDetail?.name ?? inspectCard.title ?? inspectCard.code}</div>
            </div>
            <button
              className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/10"
              onClick={closeInspect}
            >
              닫기
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-3">
            <div className="w-full rounded-lg border border-white/10 bg-slate-900/60 overflow-hidden">
              {inspectCard.type === "boss" ? (
                cardImage(inspectCard.code) ? (
                  <img src={cardImage(inspectCard.code)} alt={inspectCard.title ?? inspectCard.code} className="w-full object-cover" />
                ) : (
                  <div className="h-48 w-full flex items-center justify-center text-slate-400">이미지 없음</div>
                )
              ) : playerCardImage(inspectCard.code) ? (
                <img src={playerCardImage(inspectCard.code)} alt={inspectCard.code} className="w-full object-cover" />
              ) : (
                <div className="h-48 w-full flex items-center justify-center text-slate-400">이미지 없음</div>
              )}
            </div>

            {inspectCard.type === "boss" && typeof inspectCard.voltage === "number" && (
              <div className="text-sm text-rose-100">Voltage +{inspectCard.voltage}</div>
            )}

            {inspectCard.type === "player" && inspectCardDetail && (
              <div className="space-y-2 text-sm text-slate-100">
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {typeIconUrl(inspectCardDetail.type) && (
                    <span className="rounded-md border border-white/15 px-2 py-1 text-slate-200">
                      <img src={typeIconUrl(inspectCardDetail.type)} alt={inspectCardDetail.type} className="h-4 w-4" />
                    </span>
                  )}
                  <span className="rounded-md border border-amber-200/40 px-2 py-1 text-amber-100">MP {inspectCardDetail.mp}</span>
                  {typeof inspectCardDetail.vp === "number" && (
                    <span className="rounded-md border border-emerald-200/40 px-2 py-1 text-emerald-100">VP {inspectCardDetail.vp}</span>
                  )}
                </div>
                {inspectCardDetail.atk &&
                  (() => {
                    const { cleaned, coords } = extractRange(inspectCardDetail.atk);
                    return (
                      <div className="text-[12px] text-slate-200 flex items-center gap-2">
                        <span>공격/범위: {cleaned}</span>
                        {coords && rangeIcon(coords, "sm")}
                      </div>
                    );
                  })()}
                <div className="text-[12px] text-slate-100 whitespace-pre-line">{inspectCardDetail.text}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {(showDeckDetail || showDiscardDetail) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-[520px] max-h-[80vh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{showDeckDetail ? "덱 상세" : "버린 카드 상세"}</div>
              <button
                className="rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
                onClick={() => {
                  setShowDeckDetail(false);
                  setShowDiscardDetail(false);
                }}
              >
                닫기
              </button>
            </div>
            <div className="grid gap-2 text-xs">
              {(showDeckDetail ? me?.deck : me?.discard)?.map((c, i) => (
                <div
                  key={`${c}-${i}`}
                  className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 flex items-center justify-between"
                >
                  <span className="font-semibold">{c}</span>
                  <span className="text-[11px] text-slate-400">확장 카드 확인 영역</span>
                </div>
              )) ?? <div className="text-slate-400">카드 없음</div>}
            </div>
          </div>
        </div>
      )}

      {meNeedsEnhanced && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-[540px] rounded-2xl border border-amber-200/30 bg-slate-900/90 p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-amber-100">확장 카드 선택 (1장)</div>
              <button
                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                onClick={() => setPendingEnhancedPick(null)}
              >
                닫기
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {meEnhancedOptions.map((code) => (
                <button
                  key={code}
                  className="rounded-xl border border-amber-200/30 bg-slate-800/70 p-3 text-left hover:border-amber-300/60 hover:bg-slate-800"
                  onClick={() => {
                    setPendingEnhancedPick(code);
                    pickEnhanced(code);
                  }}
                >
                  <div className="flex gap-3 items-start">
                    <div className="h-24 w-16 rounded-lg border border-amber-200/30 bg-slate-900 overflow-hidden">
                      {playerCardImage(code) ? (
                        <img src={playerCardImage(code)} alt={code} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full text-[11px] text-slate-400 flex items-center justify-center">이미지 없음</div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="font-semibold text-sm text-amber-100">{playerCardDetail(code)?.name ?? code}</div>
                      <div className="text-[11px] text-amber-200">MP {playerCardDetail(code)?.mp ?? "?"}</div>
                      {playerCardDetail(code)?.atk &&
                        (() => {
                          const { cleaned, coords } = extractRange(playerCardDetail(code)?.atk ?? "");
                          return (
                            <div className="text-[11px] text-slate-200 flex items-center gap-2">
                              <span>{cleaned}</span>
                              {coords && rangeIcon(coords, "sm")}
                            </div>
                          );
                        })()}
                      <div className="text-[12px] text-slate-100 whitespace-pre-line">{playerCardDetail(code)?.text}</div>
                    </div>
                  </div>
                </button>
              ))}
            {meEnhancedOptions.length === 0 && <div className="text-sm text-slate-300">선택 가능한 확장 카드가 없습니다.</div>}
            </div>
            {pendingEnhancedPick && <div className="text-xs text-amber-200">선택 완료: {pendingEnhancedPick}</div>}
          </div>
        </div>
      )}

            {showSpawnPicker && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
                <div className="w-full max-w-[420px] rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-100">스폰 위치 선택</div>
              <button
                className="rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
                onClick={() => setShowSpawnPicker(null)}
              >
                닫기
              </button>
            </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SPAWN_POINTS.map((pt) => (
                      <button
                        key={`${pt.x},${pt.y}`}
                        className="rounded-xl border border-white/12 bg-slate-800/80 px-3 py-2 text-left text-sm hover:border-amber-300/50"
                        onClick={() => {
                          setPendingTurnSlotCard({ slot: showSpawnPicker.slot as 1 | 2 | 3 | 4, spawn: { x: pt.x, y: pt.y } });
                          setShowTurnCardPicker(null);
                          setShowSpawnPicker(null);
                        }}
                      >
                        {pt.label}
                      </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* turn card picker modal removed in favor of 직접 손패 선택 */}

      {cpActionModal && (
        <>
          <div className="pointer-events-none fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="pointer-events-auto w-full max-w-[520px] rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-100">CP 액션 선택</div>
                <button
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                  onClick={() => setCpActionModal(null)}
                >
                  닫기
                </button>
              </div>

              <div className="grid gap-2">
                {cpActionOptions.map((opt) => {
                  const selected = cpActionModal.actionId === opt.id;
                  const enoughCp = (me?.cp ?? 0) >= opt.cost;
                  const timingOk = opt.timing === "reaction" ? reactionTurn : myTurn;
                  return (
                    <button
                      key={opt.id}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selected ? "border-amber-300/70 bg-amber-500/15" : "border-white/12 bg-white/5"
                      } ${!timingOk ? "opacity-40" : ""}`}
                      onClick={() =>
                        setCpActionModal({
                          actionId: opt.id as typeof cpActionModal.actionId,
                          dir: opt.needsDir ? cpActionModal.dir ?? null : null,
                        })
                      }
                      disabled={!timingOk}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{opt.title}</span>
                        <span className="text-[11px] text-amber-200">{opt.cost} CP</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {opt.desc} · {opt.timing === "reaction" ? "리액션" : "턴"}
                      </div>
                      {!enoughCp && <div className="text-[11px] text-rose-200">CP 부족</div>}
                    </button>
                  );
                })}
              </div>

              {cpActionOptions.find((o) => o.id === cpActionModal.actionId)?.needsDir && (
                <div className="space-y-2">
                  <div className="text-[12px] text-slate-200">이동 방향 선택</div>
                  <div className="flex gap-2">
                    {(["N", "E", "S", "W"] as Facing[]).map((d) => (
                      <button
                        key={d}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                          cpActionModal.dir === d ? "border-amber-300/70 bg-amber-500/20" : "border-white/12 bg-white/5"
                        }`}
                        onClick={() => setCpActionModal((prev) => (prev ? { ...prev, dir: d } : prev))}
                      >
                        {d === "N" ? "↑" : d === "S" ? "↓" : d === "E" ? "→" : "←"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const selected = cpActionOptions.find((o) => o.id === cpActionModal.actionId);
                const timingOk = selected?.timing === "reaction" ? reactionTurn : myTurn;
                const needDir = selected?.needsDir && !cpActionModal.dir;
                const enoughCp = selected ? (me?.cp ?? 0) >= selected.cost : false;
                const disabled = !selected || !timingOk || needDir || !enoughCp;
                return (
                  <button
                    className="w-full rounded-xl border border-amber-300/60 bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
                    onClick={() => {
                      sendCpAction(cpActionModal.actionId, cpActionModal.dir ?? undefined);
                      setCpActionModal(null);
                    }}
                    disabled={disabled}
                  >
                    사용하기
                  </button>
                );
              })()}
              <div className="text-[11px] text-slate-400">리액션 중에는 1CP 피해 감소만 사용 가능합니다.</div>
            </div>
          </div>
        </>
      )}

      {(basicActionModal || pendingTurnSlotCard || slot3ReturnPrompt) && (
        <>
          <div className="pointer-events-none fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="pointer-events-auto w-full max-w-[520px] rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-100">
                  {basicActionModal && `기본 액션: ${basicActionModal.action === "dmgReduce" ? "-1 DMG" : "MP 충전"}`}
                  {pendingTurnSlotCard && !basicActionModal && `턴 슬롯 ${pendingTurnSlotCard.slot}`}
                  {slot3ReturnPrompt && !basicActionModal && !pendingTurnSlotCard && "슬롯 3: 덱으로 돌릴 카드"}
                </div>
                <button
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                  onClick={() => {
                    if (basicActionModal) setBasicActionModal(null);
                    if (pendingTurnSlotCard) {
                      setPendingTurnSlotCard(null);
                      setSelectedTurnSlotCard(null);
                    }
                    if (slot3ReturnPrompt) setSlot3ReturnPrompt(null);
                  }}
                >
                  닫기
                </button>
              </div>

              <div className="space-y-2 text-[12px] text-slate-200">
                {basicActionModal && <div>버릴 카드를 손패에서 클릭해 선택하세요.</div>}
                {pendingTurnSlotCard && !basicActionModal && <div>손패에서 턴 슬롯에 올릴 카드를 클릭하세요.</div>}
                {slot3ReturnPrompt && !basicActionModal && !pendingTurnSlotCard && (
                  <div>드로우 후 덱으로 돌릴 카드를 손패에서 클릭하세요.</div>
                )}
                {basicActionModal?.discard && (
                  <div className="text-sm text-amber-100">
                    선택됨: {playerCardDetail(basicActionModal.discard)?.name ?? basicActionModal.discard}
                  </div>
                )}
                {pendingTurnSlotCard && selectedTurnSlotCard && (
                  <div className="text-sm text-amber-100">
                    선택됨: {playerCardDetail(selectedTurnSlotCard)?.name ?? selectedTurnSlotCard}
                  </div>
                )}
                {slot3ReturnPrompt?.selected && (
                  <div className="text-sm text-amber-100">
                    선택됨: {playerCardDetail(slot3ReturnPrompt.selected)?.name ?? slot3ReturnPrompt.selected}
                  </div>
                )}
              </div>

              {basicActionModal && (
                <button
                  className="w-full rounded-xl border border-amber-300/60 bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
                  onClick={performBasicAction}
                  disabled={!basicActionModal.discard}
                >
                  사용하기
                </button>
              )}

              {pendingTurnSlotCard && !basicActionModal && (
                <button
                  className="w-full rounded-xl border border-amber-300/60 bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
                  onClick={confirmTurnSlotSelection}
                  disabled={!selectedTurnSlotCard}
                >
                  배치하기
                </button>
              )}

              {slot3ReturnPrompt && !basicActionModal && !pendingTurnSlotCard && (
                <button
                  className="w-full rounded-xl border border-amber-300/60 bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
                  onClick={confirmSlot3Return}
                  disabled={!slot3ReturnPrompt.selected}
                >
                  덱으로 돌리기
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {state?.reaction && (
        <div className="fixed bottom-4 right-4 z-40 w-[320px] space-y-2 rounded-2xl border border-amber-200/40 bg-slate-900/90 p-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-amber-100">리액션 대기</div>
            <div className="text-[11px] text-slate-300">
              {state.reaction.context?.type === "bossAttack" ? "클래드 공격" : state.reaction.context?.type === "legionAttack" ? "레기온" : "이벤트"}
            </div>
          </div>
          {reactionTurn ? (
            <>
              <div className="text-[12px] text-slate-200">리액션을 사용하거나 패스하세요.</div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="flex-1 rounded-lg border border-amber-300/60 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
                  onClick={() => openBasicAction("dmgReduce")}
                >
                  손패 버리고 -1 DMG
                </button>
                <button
                  className="flex-1 rounded-lg border border-blue-200/50 bg-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-500/30"
                  onClick={() => sendCpAction("guard")}
                >
                  1CP -1 DMG
                </button>
                {isFlare && (
                  <button
                    className="flex-1 rounded-lg border border-purple-200/60 bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-50 hover:bg-purple-500/30"
                    onClick={() => useCrack()}
                  >
                    크랙 스킬
                  </button>
                )}
                <button
                  className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
                  onClick={sendReactionPass}
                >
                  패스
                </button>
              </div>
              <div className="text-[11px] text-slate-400">손패의 리액션 카드를 눌러도 됩니다.</div>
            </>
          ) : (
            <div className="text-[12px] text-slate-300">
              {(state.players.find((p) => p.userId === state.reaction?.active)?.nickname ?? "상대")} 리액션 처리 중...
            </div>
          )}
        </div>
      )}

      {pendingChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-[420px] rounded-2xl border border-amber-200/30 bg-slate-900/95 p-4 shadow-2xl space-y-3">
            <div className="text-sm font-semibold text-amber-100">선택 요청</div>
            <div className="text-sm text-slate-100 whitespace-pre-line">{pendingChoice.prompt}</div>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-xl border border-emerald-300/50 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30"
                onClick={() => sendChoice(pendingChoice.choiceId, true)}
              >
                예
              </button>
              <button
                className="flex-1 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                onClick={() => sendChoice(pendingChoice.choiceId, false)}
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className="text-[10px] text-slate-200">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
