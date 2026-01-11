// apps/server/src/ws/game.ts
import type { AuthedClient } from "./state.js";
import { rooms, broadcastRoomState, sendError, send } from "./state.js";
import { SAMPLE_PLAYER_CARDS } from "../pvp/data.js";
import { prisma } from "../db/prisma.js";

// --------------------
// helpers
// --------------------
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

type Facing = "N" | "E" | "S" | "W";
type Vec2 = { x: number; y: number };

// Card DB wiring (MVP). Will be replaced when Prisma loads all cards.
type CardDbEntry = {
  code: string;
  name: string;
  mpCost: number;
  damage: number;
  gainMp: number;
  gainCp: number;
  vpCard: number;
  cardType?: string;
  range?: Vec2[];
  guard?: number;
  move?: number;
  multistrike?: number;
  notes?: string;
};
type BossPending = {
  cardCode: string;
  actionIdx: number;
  pos: Vec2;
  facing: Facing;
  damage: number;
  offsets: Vec2[];
};
type LegionPending = {
  damage: number;
  attackers: Vec2[]; // positions of head legions that are attacking
};
type Legion = {
  type: "head" | "tail";
  position: Vec2;
  facing: Facing;
  hp: number;
};
type PendingChoice = {
  id: string;
  targetUserId: string;
  type:
    | "nightParade"
    | "impale"
    | "lunaAuxDivination"
    | "lunaSoaringHeightsMove"
    | "lunaThunderstepMove"
    | "miaAuxTrapFlip"
    | "miaHeelstompExtra";
  data: any;
  defaultValue: any;
  timer?: NodeJS.Timeout;
};

const CARD_DB: Record<string, CardDbEntry> = SAMPLE_PLAYER_CARDS.reduce<Record<string, CardDbEntry>>((acc, c) => {
  acc[c.code] = {
    code: c.code,
    name: c.name,
    mpCost: c.mpCost,
    damage: c.damage,
    gainMp: c.gainMp,
    gainCp: c.gainCp,
    vpCard: c.vpCard
  };
  return acc;
}, {
  C_BASIC_STRIKE: {
    code: "C_BASIC_STRIKE",
    name: "Strike",
    mpCost: 0,
    damage: 2,
    gainMp: 0,
    gainCp: 0,
    vpCard: 0
  }
});

const MULTISTRKE_FALLBACK: Record<string, number> = {
  HacKClaD_Rosette_Delta_Cards_Shoot: 2,
  HacKClaD_Rosette_Delta_Cards_Reap: 2,
  HacKClaD_Flare_Delta_Cards_Shoot: 2,
  HacKClaD_Flare_Delta_Cards_LeadDownpour: 3,
  HacKClaD_Luna_Delta_Cards_Shoot: 2
};

const UNYIELDING_CARDS = new Set<string>([
  "HacKClaD_Rosette_Delta_Cards_Determination",
  "HacKClaD_Rosette_Delta_Cards_Carnage",
  "HacKClaD_Rosette_Delta_Cards_AuxillaryMana"
]);

const INTERCEPT_ON_DISCARD: Record<string, number> = {
  HacKClaD_Flare_Delta_Cards_BastionBattery: 1,
  HacKClaD_Flare_Delta_Cards_RetaliatingBarrage: 3,
  HacKClaD_Flare_Delta_Cards_AuxillaryMana: 2
};

const LUNA_SUPPORT_DIVINATION_CARDS = new Set<string>([
  "HacKClaD_Luna_Delta_Cards_Tsukuyomi",
  "HacKClaD_Luna_Delta_Cards_AuxillaryMana",
  "HacKClaD_Luna_Delta_Cards_SoaringHeights"
]);

// Load richer card data from Prisma (effectJson contains range/cardType/notes)
(async () => {
  try {
    const cards = await prisma.card.findMany();
    for (const c of cards) {
      let effect: any = {};
      try {
        effect = c.effectJson ? JSON.parse(c.effectJson) : {};
      } catch {
        effect = {};
      }
      const range: Vec2[] | undefined = Array.isArray(effect.range) ? effect.range.map((r: any) => ({ x: r.x ?? 0, y: r.y ?? 0 })) : undefined;
      const entry: CardDbEntry = {
        code: c.code,
        name: c.name,
        mpCost: c.costMP ?? effect.mp ?? 0,
        damage: typeof effect.atk === "number" ? effect.atk : 0,
        gainMp: effect.gainMp ?? 0,
        gainCp: effect.gainCp ?? 0,
        vpCard: effect.vp ?? effect.vpCard ?? CARD_DB[c.code]?.vpCard ?? 0,
        cardType: effect.cardType,
        range,
        guard: typeof effect.guard === "number" ? effect.guard : undefined,
        move: typeof effect.move === "number" ? effect.move : undefined,
        multistrike: typeof effect.multistrike === "number" ? effect.multistrike : MULTISTRKE_FALLBACK[c.code],
        notes: effect.notes ?? c.description
      };
      CARD_DB[c.code] = { ...CARD_DB[c.code], ...entry };
    }
    console.log("[CARD_DB] loaded from prisma:", Object.keys(CARD_DB).length);
  } catch (e) {
    console.error("[CARD_DB] prisma load failed, using SAMPLE_PLAYER_CARDS only", e);
  }
})();

function cardDef(code: string): CardDbEntry {
  return CARD_DB[code] ?? CARD_DB.C_BASIC_STRIKE;
}

function isFlare(p: any) {
  return p?.characterCode === "CH_FLARE_DELTA";
}

function isRosette(p: any) {
  return p?.characterCode === "CH_ROSETTE_DELTA";
}

function isLuna(p: any) {
  return p?.characterCode === "CH_LUNA_DELTA";
}

function isMia(p: any) {
  return p?.characterCode === "CH_MIA_DELTA";
}

// MVP basic action limits (per-character tuning)
const BASE_BASIC_LIMITS = { move: 2, mp: 2, dmgReduce: 1 };
const BASIC_DMG_LIMITS: Record<string, number> = {
  CH_ROSETTE_DELTA: 1,
  CH_FLARE_DELTA: 2,
  CH_LUNA_DELTA: 2,
  CH_MIA_DELTA: 1
};
const BASIC_MOVE_LIMITS: Record<string, number> = {
  CH_FLARE_DELTA: 1,
  CH_LUNA_DELTA: 1,
  CH_MIA_DELTA: 3
};
const BASIC_MP_LIMITS: Record<string, number> = {
  CH_MIA_DELTA: 1
};
function basicLimitsFor(p: any) {
  const moveLimit = BASIC_MOVE_LIMITS[p?.characterCode ?? ""] ?? BASE_BASIC_LIMITS.move;
  const dmgLimit = BASIC_DMG_LIMITS[p?.characterCode ?? ""] ?? BASE_BASIC_LIMITS.dmgReduce;
  const mpLimit = BASIC_MP_LIMITS[p?.characterCode ?? ""] ?? BASE_BASIC_LIMITS.mp;
  return { ...BASE_BASIC_LIMITS, move: moveLimit, dmgReduce: dmgLimit, mp: mpLimit };
}

function ensureMiaTraps(p: any): boolean[] {
  if (!isMia(p)) return [];
  if (!Array.isArray(p.conibearTraps)) {
    p.conibearTraps = [false, false];
  }
  while (p.conibearTraps.length < 2) {
    p.conibearTraps.push(false);
  }
  return p.conibearTraps;
}

function flipTrapFaceUp(p: any): boolean {
  const traps = ensureMiaTraps(p);
  const idx = traps.findIndex((t) => !t);
  if (idx < 0) return false;
  traps[idx] = true;
  return true;
}

function flipTrapFaceDown(p: any): boolean {
  const traps = ensureMiaTraps(p);
  const idx = traps.findIndex((t) => t);
  if (idx < 0) return false;
  traps[idx] = false;
  return true;
}

function recordDamage(attacker: any, amount: number) {
  if (!attacker || amount <= 0) return;
  attacker.damageDealtTurn = (attacker.damageDealtTurn ?? 0) + amount;
  attacker.damageDealtRound = (attacker.damageDealtRound ?? 0) + amount;
}

const REACTION_CARD_OVERRIDES = new Set<string>([
  "HacKClaD_Rosette_Delta_Cards_Block",
  "HacKClaD_Rosette_Delta_Cards_Carnage",
  "HacKClaD_Flare_Delta_Cards_Block",
  "HacKClaD_Flare_Delta_Cards_Logistics",
  "HacKClaD_Mia_Delta_Cards_Block",
  "HacKClaD_Mia_Delta_Cards_Substitute",
  "HacKClaD_Amelia_Delta_Cards_Block",
  "HacKClaD_Amelia_Delta_Cards_DefenseNetwork",
  "HacKClaD_Luna_Delta_Cards_Block",
  "HacKClaD_Luna_Delta_Cards_OctspanMirror"
]);

function isReactionCardDef(def: CardDbEntry, code: string) {
  const cardType = (def.cardType ?? "").toLowerCase();
  if (cardType === "reaction") return true;
  if (typeof def.guard === "number") return true;
  return REACTION_CARD_OVERRIDES.has(code);
}
const CP_ACTIONS: Record<
  string,
  { cost: number; timing: "turn" | "reaction"; effect: "guard" | "move" | "mp" | "draw" }
> = {
  guard: { cost: 1, timing: "reaction", effect: "guard" },
  move: { cost: 2, timing: "turn", effect: "move" },
  mp: { cost: 2, timing: "turn", effect: "mp" },
  draw: { cost: 4, timing: "turn", effect: "draw" }
};

// --------------------
// Clad Hydra data
// --------------------

type CladAction =
  | { type: "attack"; offsets: Vec2[] }
  | { type: "summon"; offsets: Vec2[] }
  | { type: "vpDrop"; offsets: Vec2[] }
  | { type: "move"; offset: Vec2 }
  | { type: "turn"; dir: "left" | "right" }
  | { type: "special"; kind: "homecoming" };

type CladCard = { code: string; name: string; voltage: number; actions: CladAction[] };

const CLAD_CARDS: Record<string, CladCard> = {
  HacKClaD_Clad_Hydra_Backslam: {
    code: "HacKClaD_Clad_Hydra_Backslam",
    name: "Backslam",
    voltage: 1,
    actions: [
      { type: "attack", offsets: [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 0, y: -2 }] },
      { type: "vpDrop", offsets: [{ x: 0, y: -1 }] }
    ]
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
          { x: -2, y: 2 }
        ]
      },
      { type: "summon", offsets: [{ x: -1, y: 1 }] },
      { type: "vpDrop", offsets: [{ x: -1, y: 0 }, { x: -2, y: 0 }] },
      { type: "move", offset: { x: 0, y: 1 } }
    ]
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
          { x: 2, y: 2 }
        ]
      },
      { type: "summon", offsets: [{ x: 1, y: 1 }] },
      { type: "vpDrop", offsets: [{ x: 1, y: 0 }, { x: 2, y: 0 }] },
      { type: "move", offset: { x: 0, y: 1 } }
    ]
  },
  HacKClaD_Clad_Hydra_HomecomingInstinct: {
    code: "HacKClaD_Clad_Hydra_HomecomingInstinct",
    name: "Homecoming Instinct",
    voltage: 3,
    actions: [
      { type: "special", kind: "homecoming" },
      { type: "summon", offsets: [{ x: 1, y: 2 }, { x: 2, y: -1 }, { x: -2, y: 1 }, { x: -1, y: -2 }] }
    ]
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
          { x: 2, y: 2 }
        ]
      },
      { type: "summon", offsets: [{ x: 0, y: 1 }] },
      { type: "turn", dir: "right" }
    ]
  },
  HacKClaD_Clad_Hydra_SavageFangs: {
    code: "HacKClaD_Clad_Hydra_SavageFangs",
    name: "Savage Fangs",
    voltage: 1,
    actions: [
      { type: "attack", offsets: [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
      { type: "vpDrop", offsets: [{ x: 0, y: 1 }] },
      { type: "turn", dir: "left" }
    ]
  },
  HacKClaD_Clad_Hydra_ScorchingBreath: {
    code: "HacKClaD_Clad_Hydra_ScorchingBreath",
    name: "Scorching Breath",
    voltage: 1,
    actions: [
      { type: "attack", offsets: [{ x: -1, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
      { type: "vpDrop", offsets: [{ x: 0, y: 2 }] }
    ]
  },
  HacKClaD_Clad_Hydra_Skewer: {
    code: "HacKClaD_Clad_Hydra_Skewer",
    name: "Skewer",
    voltage: 1,
    actions: [{ type: "summon", offsets: [{ x: -1, y: 0 }, { x: 1, y: 0 }] }]
  },
  HacKClaD_Clad_Hydra_SpiralAmbushLeft: {
    code: "HacKClaD_Clad_Hydra_SpiralAmbushLeft",
    name: "Spiral Ambush (L)",
    voltage: 1,
    actions: [
      { type: "summon", offsets: [{ x: 1, y: 1 }] },
      { type: "turn", dir: "left" }
    ]
  },
  HacKClaD_Clad_Hydra_SpiralAmbushRight: {
    code: "HacKClaD_Clad_Hydra_SpiralAmbushRight",
    name: "Spiral Ambush (R)",
    voltage: 1,
    actions: [
      { type: "summon", offsets: [{ x: -1, y: 1 }] },
      { type: "turn", dir: "right" }
    ]
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
          { x: 1, y: -1 }
        ]
      },
      { type: "vpDrop", offsets: [{ x: 1, y: 1 }, { x: -1, y: 1 }] },
      { type: "move", offset: { x: 0, y: 1 } }
    ]
  },
  HacKClaD_Clad_Hydra_TerrainCrush: {
    code: "HacKClaD_Clad_Hydra_TerrainCrush",
    name: "Terrain Crush",
    voltage: 2,
    actions: [
      { type: "summon", offsets: [{ x: 0, y: -1 }] },
      { type: "move", offset: { x: 0, y: 1 } },
      { type: "move", offset: { x: 0, y: 1 } }
    ]
  }
};

const LEGION_SUMMON_KIND: Record<string, "head" | "tail"> = {
  HacKClaD_Clad_Hydra_SpiralAmbushLeft: "head",
  HacKClaD_Clad_Hydra_SpiralAmbushRight: "head",
  HacKClaD_Clad_Hydra_IncineratingFlames: "head",
  HacKClaD_Clad_Hydra_CrashingFootfallsLeft: "head",
  HacKClaD_Clad_Hydra_CrashingFootfallsRight: "head",
  HacKClaD_Clad_Hydra_Skewer: "tail",
  HacKClaD_Clad_Hydra_TerrainCrush: "tail",
  HacKClaD_Clad_Hydra_HomecomingInstinct: "tail"
};

// Boss deck voltage tiers (1 -> 2 -> 3). Cards are added as the deck depletes.
const BOSS_VOLTAGE_POOLS: Record<number, string[]> = {
  1: Object.values(CLAD_CARDS)
    .filter((c) => c.voltage === 1)
    .map((c) => c.code),
  2: Object.values(CLAD_CARDS)
    .filter((c) => c.voltage === 2)
    .map((c) => c.code),
  3: Object.values(CLAD_CARDS)
    .filter((c) => c.voltage === 3)
    .map((c) => c.code)
};

function shardKey(pos: Vec2) {
  return `${pos.x},${pos.y}`;
}

function grantShards(p: any, amount: number) {
  if (amount <= 0) return;
  const bonus = p?.miaShardBonusRound ? 1 : 0;
  const total = amount + bonus;
  p.vpShards = (p.vpShards ?? 0) + total;
  p.vp = (p.vp ?? 0) + total;
}

function collectShards(state: any, p: any, pos: Vec2 | null) {
  if (!pos) return;
  const key = shardKey(pos);
  const pool = state.shardsOnBoard ?? {};
  const amt = pool[key] ?? 0;
  if (amt > 0) {
    grantShards(p, amt);
    delete pool[key];
    state.shardsOnBoard = pool;
  }
}

function applyDamageToPlayer(state: any, p: any, damage: number) {
  const oneTimeGuard = p.onceGuard ?? 0;
  const guard = p.tempGuard ?? 0;
  const afterOneTime = Math.max(0, damage - oneTimeGuard);
  if (oneTimeGuard > 0) {
    p.onceGuard = 0;
  }
  const taken = Math.max(0, afterOneTime - guard);
  p.tempGuard = Math.max(0, guard - afterOneTime);

  if (!p.unyieldingActive) {
    const currentVp = Math.max(p.vpShards ?? 0, p.vp ?? 0);
    const drop = Math.min(taken, currentVp);
    if (drop > 0 && p.position) {
      const key = shardKey(p.position);
      state.shardsOnBoard = state.shardsOnBoard ?? {};
      state.shardsOnBoard[key] = (state.shardsOnBoard[key] ?? 0) + drop;
    }
    if (drop > 0) {
      p.vpShards = Math.max(0, (p.vpShards ?? 0) - drop);
      p.vp = Math.max(0, (p.vp ?? 0) - drop);
    }
  }
  p.injury += taken;
  if (taken > 0) {
    p.position = null;
    p.facing = null;
  }
}

function bossPosition(state: any): Vec2 {
  return state.boss?.position ?? { x: 0, y: 0 };
}

function ensureFacing(f?: Facing): Facing {
  if (f === "N" || f === "E" || f === "S" || f === "W") return f;
  return "N";
}

function isBossInRange(state: any, attacker: any, range: Vec2[]): boolean {
  if (!attacker?.position) return false;
  const facing = ensureFacing(attacker.facing);
  const pos = attacker.position;
  const bossPos = bossPosition(state);
  return range
    .map((o) => rotateOffset(o, facing))
    .map((o) => wrapPosition({ x: pos.x + o.x, y: pos.y + o.y }))
    .some((t) => t.x === bossPos.x && t.y === bossPos.y);
}

function dealBossDamage(state: any, amount: number, attacker?: any) {
  if (attacker) {
    recordDamage(attacker, amount);
    attacker.vp = (attacker.vp ?? 0) + amount;
  }
}

function performIntercept(state: any, p: any, amount: number) {
  const val = Math.max(0, amount);
  if (val <= 0) return;
  p.tempGuard = (p.tempGuard ?? 0) + val;
  const pending = state.bossPending as BossPending | undefined;
  const legionPending = state.legionPending as LegionPending | undefined;
  if (pending && isFlare(p)) {
    // Counter-battery: 요격 수치만큼 공격 중인 클래드에게 피해
    dealBossDamage(state, val, p);
  } else if (legionPending && isFlare(p)) {
    // 레기온 공격에 반격: 인접한 머리 레기온에게 즉시 피해
    for (const headPos of legionPending.attackers) {
      const isAdjacent =
        p.position &&
        Math.abs(headPos.x - p.position.x) + Math.abs(headPos.y - p.position.y) === 1;
      if (isAdjacent) {
        damageLegionAt(state, headPos, val, p);
      }
    }
  } else if (isFlare(p)) {
    // Boss/Legion pending이 없으면 다음 레기온 공격에 반격 대기
    p.counterBattery = (p.counterBattery ?? 0) + val;
  }
}

function hasMaelstromFormation(p: any) {
  return Array.isArray(p.discard) && p.discard.includes("HacKClaD_Flare_Delta_Cards_MaelstromFormation");
}

function maybeTriggerMaelstrom(state: any, p: any, cpSpent: number) {
  if (cpSpent > 0) return;
  if (!hasMaelstromFormation(p)) return;
  p.cp = (p.cp ?? 0) + 1;
}

function isFacingBossFront(state: any, attacker: any): boolean {
  if (!attacker?.position) return false;
  const bossPos = bossPosition(state);
  const bossFacing: Facing = ensureFacing(state.boss?.facing ?? "N");
  const delta = { x: attacker.position.x - bossPos.x, y: attacker.position.y - bossPos.y };
  const front = rotateOffset({ x: 0, y: 1 }, bossFacing);
  return delta.x === front.x && delta.y === front.y;
}

function isFacingBossBack(state: any, attacker: any): boolean {
  if (!attacker?.position) return false;
  const bossPos = bossPosition(state);
  const bossFacing: Facing = ensureFacing(state.boss?.facing ?? "N");
  const delta = { x: attacker.position.x - bossPos.x, y: attacker.position.y - bossPos.y };
  const back = rotateOffset({ x: 0, y: -1 }, bossFacing);
  return delta.x === back.x && delta.y === back.y;
}

function reverseFacing(facing: Facing): Facing {
  if (facing === "N") return "S";
  if (facing === "S") return "N";
  if (facing === "E") return "W";
  return "E";
}

function bossTopVoltage(state: any): number | null {
  const top = state.boss?.deck?.[0];
  if (!top) return null;
  const def = CLAD_CARDS[top];
  return def?.voltage ?? null;
}

function bossTopIsVoltageOneOrEmpty(state: any): boolean {
  const top = state.boss?.deck?.[0];
  if (!top) return true;
  return bossTopVoltage(state) === 1;
}

function performDivination(state: any, p: any) {
  const top = state.boss?.deck?.[0];
  if (!top) {
    p.mp = (p.mp ?? 0) + 1;
    return;
  }
  // Divination only peeks; no state change besides the empty-deck bonus.
}

function repelBoss(state: any, from: Vec2) {
  if (state.bossMoveLockedRound) return;
  const bossPos = bossPosition(state);
  const dx = bossPos.x - from.x;
  const dy = bossPos.y - from.y;
  const step = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  const next = wrapPosition({ x: bossPos.x + step.x, y: bossPos.y + step.y });
  const occupiedByPlayer = state.players.some(
    (pl: any) => pl.position && pl.position.x === next.x && pl.position.y === next.y
  );
  if (!occupiedByPlayer) {
    state.boss.position = next;
  }
}

function directionFromTo(from: Vec2, to: Vec2): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "E" : "W";
  }
  return dy >= 0 ? "N" : "S";
}

function performBossAttack(
  state: any,
  p: any,
  range: Vec2[],
  atk: number,
  extra?: { repelFrom?: Vec2; forceBossHit?: boolean; skipLegions?: boolean; destroyed?: Vec2[] }
) {
  const targets = range
    .map((o) => rotateOffset(o, ensureFacing(p.facing)))
    .map((o) => wrapPosition({ x: p.position.x + o.x, y: p.position.y + o.y }));
  // damage legions on targeted tiles
  if (!extra?.skipLegions) {
    for (const t of targets) {
      const defeated = damageLegionAt(state, t, atk, p);
      if (defeated && extra?.destroyed) {
        extra.destroyed.push({ x: t.x, y: t.y });
      }
    }
  }
  const hitBoss = extra?.forceBossHit === true || targets.some((t) => {
    const bossPos = bossPosition(state);
    return t.x === bossPos.x && t.y === bossPos.y;
  });
  if (hitBoss) {
    dealBossDamage(state, atk, p);
    if (extra?.repelFrom) {
      repelBoss(state, extra.repelFrom);
    }
  }
}

function computeReactionOrder(state: any): string[] {
  return state.players
    .slice()
    .sort((a: any, b: any) => (a.chosenSlot ?? 10) - (b.chosenSlot ?? 10) || a.userId.localeCompare(b.userId))
    .map((p: any) => p.userId);
}

function computeAttackTargets(pos: Vec2, facing: Facing, offsets: Vec2[]): Vec2[] {
  return offsets.map((o) => {
    const r = rotateOffset(o, facing);
    return wrapPosition({ x: pos.x + r.x, y: pos.y + r.y });
  });
}

function eligiblePlayersForAttack(state: any, pending: BossPending): string[] {
  const targets = computeAttackTargets(pending.pos, pending.facing, pending.offsets);
  return state.players
    .filter((pl: any) => pl.position && targets.some((t) => t.x === pl.position.x && t.y === pl.position.y))
    .map((pl: any) => pl.userId);
}

function legionTargetsFromPending(state: any, pending: LegionPending): Array<{ userId: string; player: any }> {
  const adjOffsets: Vec2[] = [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 }
  ];
  const results: Array<{ userId: string; player: any }> = [];
  for (const head of pending.attackers) {
    for (const off of adjOffsets) {
      const t = wrapPosition({ x: head.x + off.x, y: head.y + off.y });
      const hit = state.players.find((pl: any) => pl.position && pl.position.x === t.x && pl.position.y === t.y);
      if (hit && !results.some((r) => r.userId === hit.userId)) {
        results.push({ userId: hit.userId, player: hit });
      }
    }
  }
  return results;
}

function eligiblePlayersForLegion(state: any, pending: LegionPending): string[] {
  return legionTargetsFromPending(state, pending).map((t) => t.userId);
}

function applyLegionPendingDamage(state: any) {
  const pending = state.legionPending as LegionPending | undefined;
  if (!pending) return;
  const targets = legionTargetsFromPending(state, pending);
  for (const { player } of targets) {
    if (isFlare(player) && player.position && (player.counterBattery ?? 0) > 0) {
      const counterDmg = player.counterBattery ?? 0;
      for (const headPos of pending.attackers) {
        const isAdjacent = Math.abs(headPos.x - player.position.x) + Math.abs(headPos.y - player.position.y) === 1;
        if (isAdjacent) {
          damageLegionAt(state, headPos, counterDmg, player);
        }
      }
      player.counterBattery = 0;
    }
    applyDamageToPlayer(state, player, pending.damage);
  }
  state.legionPending = null;
}

function requestChoice(
  state: any,
  roomClients: any[],
  targetUserId: string,
  type: PendingChoice["type"],
  data: any,
  prompt: string,
  defaultValue: any
) {
  clearChoice(state);
  const choiceId = `${type}-${Date.now()}-${Math.random()}`;
  const target = roomClients.find((c: any) => c.user.id === targetUserId);
  state.pendingChoice = { id: choiceId, targetUserId, type, data, defaultValue };
  if (target) {
    send(target.ws, { type: "game:choose", choiceId, prompt, options: { type } });
  }
  state.pendingChoice.timer = setTimeout(() => {
    applyChoice(state, roomClients, choiceId, defaultValue, null);
  }, 5000);
}

function applyChoice(state: any, roomClients: any[], choiceId: string, value: any, client: any) {
  const pending: PendingChoice | undefined = state.pendingChoice;
  if (!pending || pending.id !== choiceId) return;
  clearChoice(state);
  const p = getPlayer(state, pending.targetUserId);
  if (!p) return;

  if (pending.type === "nightParade") {
    if (value === true) {
      const top = p.deck.shift();
      if (top) {
        p.discard.push(top);
        const defTop = cardDef(top);
        const topType = defTop.cardType ?? "support";
        if (topType !== "reaction") {
          // play immediately
          const idxDis = p.discard.indexOf(top);
          if (idxDis >= 0) p.discard.splice(idxDis, 1);
          p.hand.push(top);
          const fakeClient = client ?? roomClients.find((c: any) => c.user.id === p.userId);
          if (fakeClient) {
            handlePvpPlayCard(fakeClient, state.roomId, top, p.facing ?? "N", roomClients);
          }
        }
      }
      p.crackBonus = (p.crackBonus ?? 0) + 1;
    }
  } else if (pending.type === "impale") {
    if (value === true && (p.cp ?? 0) >= 1 && p.position) {
      p.cp -= 1;
      const bossPos = bossPosition(state);
      state.boss.facing = directionFromTo(bossPos, p.position);
    }
  } else if (pending.type === "lunaAuxDivination") {
    if (value === true && (p.mp ?? 0) >= 1) {
      p.mp -= 1;
      performDivination(state, p);
    }
  } else if (pending.type === "lunaSoaringHeightsMove") {
    if (value === true && Array.isArray(pending.data?.targets)) {
      const target = pending.data.targets.find((t: Vec2) => !isOccupied(state, p, t));
      if (target) {
        movePlayerTo(state, p, target);
      }
    }
  } else if (pending.type === "lunaThunderstepMove") {
    if (value === true && Array.isArray(pending.data?.targets)) {
      const target = pending.data.targets.find((t: Vec2) => !isOccupied(state, p, t));
      if (target) {
        movePlayerTo(state, p, target);
      }
    }
  } else if (pending.type === "miaAuxTrapFlip") {
    if (value === true && (p.mp ?? 0) >= 1) {
      if (flipTrapFaceUp(p)) {
        p.mp -= 1;
      } else {
        const target = client ?? roomClients.find((c: any) => c.user.id === p.userId);
        if (target) {
          sendError(target.ws, "No face-down Conibear Trap to flip.");
        }
      }
    }
  } else if (pending.type === "miaHeelstompExtra") {
    p.miaHeelstompExtra = value === true;
    const cardCode = pending.data?.cardCode;
    const dir = pending.data?.dir;
    const target = client ?? roomClients.find((c: any) => c.user.id === p.userId);
    if (target && cardCode) {
      handlePvpPlayCard(target, state.roomId, cardCode, dir ?? p.facing ?? "N", roomClients);
    }
  }
  if (state.roomId) {
    broadcastState(state);
  }
}

// Board helpers
function rotateOffset(offset: Vec2, facing: Facing): Vec2 {
  const { x, y } = offset;
  if (facing === "N") return { x, y };
  if (facing === "E") return { x: y, y: -x };
  if (facing === "S") return { x: -x, y: -y };
  return { x: -y, y: x }; // W
}

function wrapCoord(v: number, size = 5) {
  const half = Math.floor(size / 2);
  return ((((v + half) % size) + size) % size) - half;
}

function wrapPosition(pos: Vec2, size = 5): Vec2 {
  return { x: wrapCoord(pos.x, size), y: wrapCoord(pos.y, size) };
}

function manhattanWrapped(a: Vec2, b: Vec2, size = 5): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const wrapDx = Math.min(dx, size - dx);
  const wrapDy = Math.min(dy, size - dy);
  return wrapDx + wrapDy;
}

function directionToDelta(dir: Facing): Vec2 {
  if (dir === "N") return { x: 0, y: 1 };
  if (dir === "S") return { x: 0, y: -1 };
  if (dir === "E") return { x: 1, y: 0 };
  return { x: -1, y: 0 };
}

function attemptMove(state: any, p: any, offset: Vec2, opts?: { newFacing?: Facing | null; collect?: boolean }): boolean {
  if (!p.position) return false;
  if (p.cannotMoveThisTurn) return false;
  const target = wrapPosition({ x: p.position.x + offset.x, y: p.position.y + offset.y });
  if (isOccupied(state, p, target)) return false;

  p.position = target;
  if (opts?.newFacing) {
    p.facing = opts.newFacing;
  }
  p.movedThisTurn = true;
  if (opts?.collect !== false) {
    collectShards(state, p, p.position);
  }
  return true;
}

function attemptDirectionalMove(
  state: any,
  p: any,
  dir: Facing,
  opts?: { updateFacing?: boolean; collect?: boolean }
): boolean {
  const offset = directionToDelta(dir);
  const newFacing = opts?.updateFacing === false ? null : dir;
  return attemptMove(state, p, offset, { newFacing, collect: opts?.collect });
}

function movePlayerTo(state: any, p: any, target: Vec2) {
  if (!p.position) return false;
  if (p.cannotMoveThisTurn) return false;
  if (isOccupied(state, p, target)) return false;
  p.facing = directionFromTo(p.position, target);
  p.position = target;
  p.movedThisTurn = true;
  collectShards(state, p, p.position);
  return true;
}

function currentVoltage(state: any): number {
  return state.boss?.voltage ?? state.boss?.voltageTier ?? state.voltage ?? 1;
}

function isOccupied(state: any, me: any, pos: Vec2) {
  if (state.boss?.position && state.boss.position.x === pos.x && state.boss.position.y === pos.y) return true;
  if (Array.isArray(state.legions)) {
    const hasLegion = state.legions.some((l: Legion) => l.position.x === pos.x && l.position.y === pos.y);
    if (hasLegion) return true;
  }
  return state.players.some(
    (pl: any) => pl !== me && pl.position && pl.position.x === pos.x && pl.position.y === pos.y
  );
}

function placeAtEntry(state: any, p: any) {
  const ENTRY_POINTS: Array<{ x: number; y: number }> = [
    { x: -2, y: -1 }, // Entry A
    { x: 2, y: 1 }, // Entry B
    { x: -1, y: 2 }, // Entry C
    { x: 1, y: -2 } // Entry D
  ];
  for (const ep of ENTRY_POINTS) {
    const occupied = state.players.some(
      (pl: any) => pl !== p && pl.position && pl.position.x === ep.x && pl.position.y === ep.y
    );
    if (!occupied) {
      p.position = { ...ep };
      p.facing = "N";
      collectShards(state, p, p.position);
      return;
    }
  }
  // fallback: place at center if all entries occupied
  p.position = { x: 0, y: 0 };
  p.facing = "N";
  collectShards(state, p, p.position);
}

function availableEntries(state: any, p: any) {
  const ENTRY_POINTS: Array<{ x: number; y: number }> = [
    { x: -2, y: -1 },
    { x: 2, y: 1 },
    { x: -1, y: 2 },
    { x: 1, y: -2 }
  ];
  return ENTRY_POINTS.filter(
    (ep) => !state.players.some((pl: any) => pl !== p && pl.position && pl.position.x === ep.x && pl.position.y === ep.y)
  );
}

function setLegion(state: any, pos: Vec2, type: "head" | "tail", facing: Facing) {
  state.legions = state.legions ?? [];
  const wrapped = wrapPosition(pos);
  state.legions = state.legions.filter(
    (l: Legion) => !(l.position.x === wrapped.x && l.position.y === wrapped.y)
  );
  state.legions.push({ type, position: wrapped, facing, hp: currentVoltage(state) });
}

function rewardForLegionDefeat(state: any, legion: Legion, attacker: any) {
  const gain = currentVoltage(state);
  if (!attacker) return;
  const total = gain + (legion.type === "head" ? 1 : 0);
  grantShards(attacker, total);
}

function damageLegionAt(state: any, pos: Vec2, damage: number, attacker: any) {
  if (!Array.isArray(state.legions)) return;
  const idx = state.legions.findIndex((l: Legion) => l.position.x === pos.x && l.position.y === pos.y);
  if (idx < 0) return;
  const legion = state.legions[idx];
  const currentHp = legion.hp ?? currentVoltage(state);
  const dealt = Math.min(damage, currentHp);
  recordDamage(attacker, dealt);
  legion.hp = Math.max(0, currentHp - damage);
  if (legion.hp <= 0) {
    state.legions.splice(idx, 1);
    rewardForLegionDefeat(state, legion, attacker);
    return legion;
  } else {
    state.legions[idx] = legion;
  }
}

function resetLegionHp(state: any) {
  const v = currentVoltage(state);
  if (!Array.isArray(state.legions)) return;
  for (const l of state.legions) {
    l.hp = v;
  }
}

type TurnStep =
  | { type: "player"; userId: string }
  | { type: "boss"; cardIndex: number; cardCode: string }
  | { type: "legion" };

// --------------------
// deck helpers
// --------------------
function getPlayer(state: any, userId: string) {
  return state.players.find((x: any) => x.userId === userId);
}

function getActionState(roomId: string) {
  const state = rooms.get(roomId);
  if (!state || state.phase !== "action" || state.finished) return null;
  return state;
}

function getActionContext(roomId: string, userId: string, opts?: { allowReaction?: boolean }) {
  const state = getActionState(roomId);
  if (!state) return null;
  const player = getPlayer(state, userId);
  if (!player) return null;

  const turn = state.currentTurn;
  const isReaction = state.reaction?.active === userId;
  const isMyTurn = turn && turn.type === "player" && turn.userId === userId;
  const allowReaction = opts?.allowReaction !== false;

  if (!isMyTurn && !(allowReaction && isReaction)) return null;

  return { state, player, isReaction, isMyTurn };
}

export function handlePvpEnter(client: AuthedClient, roomId: string, pos: Vec2, roomClients: AuthedClient[]) {
  const state = getActionState(roomId);
  if (!state) return;
  const p = getPlayer(state, client.user.id);
  if (!p) return;
  if (state.currentTurn?.type !== "player" || state.currentTurn.userId !== client.user.id) return;
  if (p.position) return;
  const options = availableEntries(state, p);
  const allowed = options.some((ep) => ep.x === pos.x && ep.y === pos.y);
  if (!allowed) return;
  p.position = wrapPosition(pos);
  p.facing = "N";
  collectShards(state, p, p.position);
  broadcastRoomState(roomId, state);
}

function placeIfNeeded(state: any, userId: string) {
  const p = getPlayer(state, userId);
  if (!p) return;
  if (p.position) return;

  const spawnCandidates = [
    { x: -2, y: -1 },
    { x: 2, y: 1 },
    { x: -1, y: 2 },
    { x: 1, y: -2 }
  ];

  const occupied = new Set(
    state.players
      .filter((pl: any) => pl.position)
      .map((pl: any) => `${pl.position.x},${pl.position.y}`)
  );

  const slot = spawnCandidates.find((c) => !occupied.has(`${c.x},${c.y}`)) ?? spawnCandidates[0];
  p.position = slot;
  p.facing = "N";
  collectShards(state, p, p.position);
}

function reformIfNeeded(p: any) {
  if (p.deck.length > 0) return;
  if (p.discard.length === 0) return;
  if (p.reformUsedThisRound) return;

  // Optional upgrade: swap an enhanced card into the deck, swapping out one discard card into the enhanced pool
  const enhancedPool: string[] = Array.isArray(p.enhancedDeck) ? p.enhancedDeck : [];
  if (enhancedPool.length > 0 && p.discard.length > 0) {
    const enhancedPick = enhancedPool[0];
    const swapOut = p.discard.pop();
    if (swapOut) {
      p.enhancedDeck = enhancedPool.filter((c) => c !== enhancedPick);
      p.enhancedDeck.push(swapOut);
      p.deck.push(enhancedPick);
    }
  }

  p.deck.push(...p.discard);
  p.deck = shuffle(p.deck);
  p.discard = [];
  p.cp = (p.cp ?? 0) + 2; // Gain 2 CP when reforming (once per round)
  p.reformUsedThisRound = true;
}

function drawCard(p: any) {
  if (p.deck.length === 0) reformIfNeeded(p);
  if (p.deck.length === 0) return;
  p.hand.push(p.deck.shift());
}

function drawTo3(p: any) {
  while (p.hand.length < 3) {
    drawCard(p);
    if (p.deck.length === 0 && p.discard.length === 0) break;
  }
}

function canPayForCard(p: any, d: CardDbEntry): boolean {
  return (p.mp ?? 0) >= d.mpCost;
}

function applyCardEconomy(p: any, d: CardDbEntry) {
  p.mp -= d.mpCost;
  p.mp += d.gainMp;
  p.cp += d.gainCp;
}

function discardFromHand(p: any, cardCode: string): boolean {
  const idx = p.hand.indexOf(cardCode);
  if (idx < 0) return false;
  p.hand.splice(idx, 1);
  p.discard.push(cardCode);
  return true;
}

function activateUnyielding(p: any) {
  p.unyieldingActive = true;
}

function clearChoice(state: any) {
  const pending: PendingChoice | undefined = state.pendingChoice;
  if (pending?.timer) {
    clearTimeout(pending.timer);
  }
  state.pendingChoice = null;
}

function allReady(state: any) {
  return state.players.every((p: any) => p.ready === true);
}

function allSlotsChosen(state: any) {
  return state.players.every((p: any) => typeof p.chosenSlot === "number");
}

function allEnhancedPicked(state: any) {
  return state.players.every((p: any) => p.needsEnhancedPick !== true);
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

function refillBossDeckIfNeeded(state: any) {
  if (state.boss.deck.length > 0) return;

  const tier = state.boss.voltageTier ?? 1;
  let nextTier = tier;

  // Advance to the next voltage tier (max 3) when the deck is empty, and add that tier's cards.
  if (tier < 3) {
    nextTier = tier + 1;
    const toAdd = BOSS_VOLTAGE_POOLS[nextTier] ?? [];
    state.boss.discard.push(...toAdd);
  }

  if (state.boss.discard?.length > 0) {
    state.boss.deck = shuffle(state.boss.discard);
    state.boss.discard = [];
    state.boss.voltageTier = nextTier;
    state.boss.voltage = nextTier;
    state.voltage = nextTier;
  }
}

function forecastThree(state: any) {
  refillBossDeckIfNeeded(state);
  const cards: string[] = [];
  for (let i = 0; i < 3; i++) {
    if (state.boss.deck.length === 0) refillBossDeckIfNeeded(state);
    const top = state.boss.deck.shift();
    if (top) {
      cards.push(top);
      state.boss.discard.push(top);
    }
  }
  state.boss.foresight = cards;
}

function executeBossActions(
  state: any,
  card: CladCard,
  startIdx: number,
  pos: Vec2,
  facing: Facing,
  damage: number
): { halted: boolean; pos: Vec2; facing: Facing } {
  for (let idx = startIdx; idx < card.actions.length; idx++) {
    const action = card.actions[idx];
    if (action.type === "move") {
      if (state.bossMoveLockedRound) {
        continue;
      }
      const delta = rotateOffset(action.offset, facing);
      pos = wrapPosition({ x: pos.x + delta.x, y: pos.y + delta.y });
    } else if (action.type === "turn") {
      facing = turnFacing(facing, action.dir);
    } else if (action.type === "summon") {
      const kind = LEGION_SUMMON_KIND[card.code];
      if (kind) {
        for (const off of action.offsets) {
          const delta = rotateOffset(off, facing);
          const summonPos = wrapPosition({ x: pos.x + delta.x, y: pos.y + delta.y });
          setLegion(state, summonPos, kind, facing);
        }
      }
    } else if (action.type === "special" && action.kind === "homecoming") {
      pos = { x: 0, y: 0 };
      facing = "N";
    } else if (action.type === "vpDrop") {
      for (const off of action.offsets) {
        const delta = rotateOffset(off, facing);
        const dropPos = wrapPosition({ x: pos.x + delta.x, y: pos.y + delta.y });
        const key = shardKey(dropPos);
        state.shardsOnBoard = state.shardsOnBoard ?? {};
        state.shardsOnBoard[key] = (state.shardsOnBoard[key] ?? 0) + 1;
      }
    } else if (action.type === "attack") {
      const pending: BossPending = {
        cardCode: card.code,
        actionIdx: idx,
        pos,
        facing,
        damage,
        offsets: action.offsets
      };
      const targets = computeAttackTargets(pos, facing, action.offsets);
      const inRange = state.players.filter(
        (pl: any) => pl.position && targets.some((t) => t.x === pl.position.x && t.y === pl.position.y)
      );
      if (inRange.length === 0) {
        continue;
      }
      const order = computeReactionOrder(state);
      const eligible = eligiblePlayersForAttack(state, pending).filter((id) => order.includes(id));
      if (eligible.length === 0) {
        // no reaction, apply damage immediately
        for (const pl of inRange) applyDamageToPlayer(state, pl, damage);
        continue;
      }
      const active = eligible[0];
      state.reaction = { active, eligible, passed: [], context: { type: "bossAttack" } };
      state.bossPending = pending;
      if (state.roomId) {
        broadcastState(state);
      }
      return { halted: true, pos, facing };
    }
  }
  state.boss.position = pos;
  state.boss.facing = facing;
  return { halted: false, pos, facing };
}

function resolveBossCard(state: any, step: { cardCode: string }): boolean {
  const card = CLAD_CARDS[step.cardCode];
  if (!card) return false;

  // Voltage is tied to tier (1-3). Deck refills bump voltage; individual cards do not.
  state.boss.voltage = state.boss.voltageTier ?? state.boss.voltage ?? state.voltage ?? 1;
  state.voltage = state.boss.voltage;

  const pos = state.boss.position ?? { x: 0, y: 0 };
  const facing: Facing = state.boss.facing ?? "N";
  // ensure boss state is initialized before executing actions
  state.boss.position = pos;
  state.boss.facing = facing;

  const damage = currentVoltage(state);

  const result = executeBossActions(state, card, 0, pos, facing, damage);
  return result.halted;
}

function performLegionAttack(state: any): boolean {
  const voltage = currentVoltage(state);
  if (voltage <= 0) return false;
  const heads: Legion[] = (state.legions ?? []).filter((l: Legion) => l.type === "head");
  const adjOffsets: Vec2[] = [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 }
  ];

  const targets: Array<{ userId: string; player: any }> = [];
  for (const head of heads) {
    const pos = head.position;
    for (const off of adjOffsets) {
      const t = wrapPosition({ x: pos.x + off.x, y: pos.y + off.y });
      const hit = state.players.find(
        (pl: any) => pl.position && pl.position.x === t.x && pl.position.y === t.y
      );
      if (hit && !targets.some((x) => x.userId === hit.userId)) {
        targets.push({ userId: hit.userId, player: hit });
      }
    }
  }

  const attackers = heads.map((h) => h.position);
  const eligible = targets.map((t) => t.userId);
  if (eligible.length === 0) return false;
  const order = computeReactionOrder(state);
  const ordered = eligible.filter((id) => order.includes(id));
  if (ordered.length === 0) {
    for (const { player } of targets) {
      applyDamageToPlayer(state, player, voltage);
    }
    return false;
  }
  state.legionPending = { damage: voltage, attackers };
  state.reaction = { active: ordered[0], eligible: ordered, passed: [], context: { type: "legionAttack" } };
  broadcastState(state);
  return true;
}

function resolveLegionAttack(state: any): boolean {
  return performLegionAttack(state);
}

function resumeBossAfterReaction(state: any) {
  const pending = state.bossPending;
  if (!pending) return;
  const card = CLAD_CARDS[pending.cardCode];
  if (!card) {
    state.bossPending = null;
    return;
  }
  const res = executeBossActions(state, card, pending.actionIdx + 1, pending.pos, pending.facing, pending.damage);
  if (!res.halted) {
    state.bossPending = null;
    state.actionIndex = (state.actionIndex ?? 0) + 1;
    advanceTurn(state);
  }
}

function refreshReactionEligibility(state: any) {
  const reaction = state.reaction;
  const ctxType = reaction?.context?.type;
  if (!reaction || !ctxType) return;

  if (ctxType === "bossAttack") {
    const pending = state.bossPending as BossPending | undefined;
    if (!pending) {
      state.reaction = null;
      return;
    }
    const order = computeReactionOrder(state);
    const eligible = eligiblePlayersForAttack(state, pending).filter((id) => order.includes(id));
    const rangeChanged =
      eligible.length !== reaction.eligible.length || eligible.some((id) => !reaction.eligible.includes(id));
    if (rangeChanged) {
      reaction.passed = [];
    }
    reaction.eligible = eligible;
    if (eligible.length === 0) {
      const targets = eligiblePlayersForAttack(state, pending);
      state.reaction = null;
      for (const id of targets) {
        const target = getPlayer(state, id);
        if (target) applyDamageToPlayer(state, target, pending.damage);
      }
      resumeBossAfterReaction(state);
      if (state.roomId) {
        broadcastState(state);
      }
      return;
    }
    const currentActive = reaction.active;
    if (!currentActive || rangeChanged || !eligible.includes(currentActive)) {
      reaction.active = eligible[0];
    }
    if (state.roomId) {
      broadcastState(state);
    }
    return;
  }

  if (ctxType === "legionAttack") {
    const pending = state.legionPending as LegionPending | undefined;
    if (!pending) {
      state.reaction = null;
      return;
    }
    const order = computeReactionOrder(state);
    const eligible = eligiblePlayersForLegion(state, pending).filter((id) => order.includes(id));
    const rangeChanged =
      eligible.length !== reaction.eligible.length || eligible.some((id) => !reaction.eligible.includes(id));
    if (rangeChanged) {
      reaction.passed = [];
    }
    reaction.eligible = eligible;
    if (eligible.length === 0) {
      state.reaction = null;
      applyLegionPendingDamage(state);
      state.actionIndex = (state.actionIndex ?? 0) + 1;
      advanceTurn(state);
      if (state.roomId) {
        broadcastState(state);
      }
      return;
    }
    const currentActive = reaction.active;
    if (!currentActive || rangeChanged || !eligible.includes(currentActive)) {
      reaction.active = eligible[0];
    }
    if (state.roomId) {
      broadcastState(state);
    }
  }
}

// --------------------
// Turn helpers
// --------------------
function buildActionQueue(state: any): TurnStep[] {
  const queue: TurnStep[] = [];
  const bossCards = state.boss.foresight ?? [];
  const playersBySlot: Record<number, any> = {};
  for (const p of state.players) {
    if (typeof p.chosenSlot === "number") {
      playersBySlot[p.chosenSlot] = p;
    }
  }

  // Interleave per slot: Slot1 -> Boss1 -> Slot2 -> Boss2 -> Slot3 -> Boss3 -> Slot4
  const maxIdx = Math.max(bossCards.length, 4);
  for (let i = 0; i < maxIdx; i++) {
    const slot = i + 1;
    const player = playersBySlot[slot];
    if (player) {
      queue.push({ type: "player", userId: player.userId });
    }
    if (bossCards[i]) {
      queue.push({ type: "boss", cardIndex: i, cardCode: bossCards[i] });
    }
  }
  // After turn slot 4, simultaneous legion attack
  queue.push({ type: "legion" });
  return queue;
}

function markDoneAndAdvance(state: any) {
  if (state.phase !== "action") return;
  if (state.currentTurn && state.currentTurn.type === "player") {
    const p = getPlayer(state, state.currentTurn.userId);
    if (p) {
      p.crackAtkBonus = 0;
      p.crackUsedTurn = 0;
      p.crackBonus = 0;
      p.actedThisRound = true;
      p.nextAttackBonus = 0;
      p.nextAttackAlwaysInRange = false;
      p.cannotMoveThisTurn = false;
      p.onceGuard = 0;
      p.nextAttackMultistrike = 0;
      p.attacksPlayedThisTurn = 0;
      p.supportsPlayedThisTurn = 0;
      if (p.chosenSlot === 4) {
        state.legionAttackReady = true;
      }
    }
  }
  state.currentTurn = null;
  state.actionIndex = (state.actionIndex ?? 0) + 1;
  advanceTurn(state);
}

function advanceTurn(state: any) {
  if (state.phase !== "action") return;
  if (!state.actionQueue) return;

  if (state.reaction) return;

  state.currentTurn = null;

  while (state.actionIndex < state.actionQueue.length) {
    const step = state.actionQueue[state.actionIndex];
    if (step.type === "boss") {
      state.currentTurn = step;
      resetLegionHp(state);
      const halted = resolveBossCard(state, step);
      if (halted) {
        // wait for reaction resolution (only if a reaction is actually pending)
        if (state.reaction) return;
      }
      state.actionIndex += 1;
      if (state.roomId) broadcastState(state);
      continue;
    } else if (step.type === "legion") {
      state.currentTurn = step;
      resetLegionHp(state);
      const halted = resolveLegionAttack(state);
      if (halted) return;
      state.actionIndex += 1;
      if (state.roomId) broadcastState(state);
      continue;
    }

    // player turn
    const p = getPlayer(state, step.userId);
    if (p && !p.position) {
      const options = availableEntries(state, p);
      if (options.length === 0) {
        placeAtEntry(state, p);
      } else {
        state.currentTurn = step;
        return;
      }
    }
    if (!p) {
      state.actionIndex += 1;
      continue;
    }
    if (p) {
      p.movedThisTurn = false;
      p.cannotMoveThisTurn = false;
      p.nextAttackBonus = 0;
      p.nextAttackAlwaysInRange = false;
      p.nextAttackMultistrike = 0;
      p.attacksPlayedThisTurn = 0;
      p.supportsPlayedThisTurn = 0;
      p.damageDealtTurn = 0;
      p.convergenceSealUsedTurn = false;
    }
    state.currentTurn = step;
    return;
  }

  // Action queue finished -> end round or score
  state.currentTurn = null;
  endRoundOrScore(state);
  if (state.roomId) broadcastState(state);
}

function resetForNextRound(state: any) {
  for (const p of state.players) {
    if (typeof p.chosenSlot === "number") {
      // Turn slot 1(left) -> standby 4(rightmost), so standby = 5 - turnSlot
      p.standbySlot = 5 - p.chosenSlot;
      p.standbyCard = p.turnCard ?? p.standbyCard ?? null;
    }
    p.chosenSlot = undefined;
    p.turnCard = null;
    p.actedThisRound = false;
    p.reformUsedThisRound = false;
    p.basicUses = { move: 0, mp: 0, dmgReduce: 0 };
    p.tempGuard = 0;
    p.unyieldingActive = false;
    p.crackBonus = 0;
    p.crackUsedTurn = 0;
    p.crackAtkBonus = 0;
    p.crackUsedRound = 0;
    p.counterBattery = 0;
    p.movedThisTurn = false;
    p.cannotMoveThisTurn = false;
    p.nextAttackBonus = 0;
    p.nextAttackAlwaysInRange = false;
    p.onceGuard = 0;
    p.nextAttackMultistrike = 0;
    p.attacksPlayedThisTurn = 0;
    p.supportsPlayedThisTurn = 0;
    p.damageDealtRound = 0;
    p.miaShardBonusRound = false;
    p.miaStealthUsedRound = false;
    p.convergenceSealUsedTurn = false;
  }
  clearChoice(state);
  state.boss.foresight = [];
  state.bossMoveLockedRound = false;
  state.actionQueue = [];
  state.actionIndex = 0;
  state.currentTurn = null;
  state.legionAttackDone = false;
  state.legionAttackReady = false;
  state.legionPending = null;
  resetLegionHp(state);
}

function endRoundOrScore(state: any) {
  if (state.round >= 9) {
    state.phase = "scoring";
    state.finished = true;
    return;
  }
  state.round += 1;
  state.phase = "forecast";
  resetForNextRound(state);
  // After resetting, immediately progress to the next phase
  progress(state);
  if (state.roomId) broadcastState(state);
}

// --------------------
// phase progression
// --------------------
function progress(state: any) {
  if (state.finished) return;
  if (!allReady(state)) return;
  if (!allEnhancedPicked(state)) return;

  if (state.phase === "forecast") {
    forecastThree(state);
    state.phase = "draw";
  }

  if (state.phase === "draw") {
    for (const p of state.players) {
      drawTo3(p);
      p.actedThisRound = false;
    }
    state.phase = "draft";
  }

  if (state.phase === "draft") {
    if (!allSlotsChosen(state)) return;
    state.actionQueue = buildActionQueue(state);
    state.actionIndex = 0;
    state.currentTurn = null;
    state.phase = "action";
    resetLegionHp(state);
    advanceTurn(state);
  }

  if (state.phase === "action") {
    advanceTurn(state);
  }
}

function computeFinalScores(state: any) {
  return state.players
    .map((p: any) => {
      const allCodes = [...p.deck, ...p.discard, ...p.hand];
      const cardVp = allCodes.reduce((acc: number, code: string) => {
        return acc + cardDef(code).vpCard;
      }, 0);

      const finalVp = (p.vpShards ?? p.vp ?? 0) + cardVp - p.injury;
      return { userId: p.userId, nickname: p.nickname, finalVp };
    })
    .sort((a: any, b: any) => b.finalVp - a.finalVp);
}

function buildPayload(state: any) {
  const payload: any = { ...state };
  if (state.phase === "scoring" && state.finished) {
    payload.finalScores = computeFinalScores(state);
  }
  // hide private cards info from other players? (MVP: send full state)
  return payload;
}

function broadcastState(state: any) {
  if (state.roomId) {
    broadcastRoomState(state.roomId, buildPayload(state));
  }
}

// --------------------
// handlers
// --------------------
export function handleGameSubscribe(client: AuthedClient, roomId: string, _roomClients: AuthedClient[]) {
  const state = rooms.get(roomId);
  if (!state) {
    sendError(client.ws, "Room not found");
    return;
  }
  client.roomId = roomId;
  broadcastState(state);
}

export function handleGameChoice(client: AuthedClient, roomId: string, choiceId: string, value: any, roomClients: AuthedClient[]) {
  const state = rooms.get(roomId);
  if (!state) return;
  const pending: PendingChoice | undefined = state.pendingChoice;
  if (!pending || pending.id !== choiceId) return;
  if (pending.targetUserId !== client.user.id) return;
  applyChoice(state, roomClients, choiceId, value, client);
}

export function handlePvpReady(client: AuthedClient, roomId: string, _roomClients: AuthedClient[]) {
  const state = rooms.get(roomId);
  if (!state) return;

  const p = getPlayer(state, client.user.id);
  if (!p) return;

  p.ready = true;
  progress(state);

  broadcastState(state);
}

export function handlePvpChooseSlot(
  client: AuthedClient,
  roomId: string,
  slot: number,
  turnCardCode: string,
  spawn: { x: number; y: number } | null,
  returnCardCode: string | null,
  moveTarget: { x: number; y: number } | null,
  _roomClients: AuthedClient[]
) {
  const state = rooms.get(roomId);
  if (!state) return;
  if (state.phase !== "draft" || state.finished) return;
  if (!allEnhancedPicked(state)) return;
  if (slot < 1 || slot > 4) return;

  const taken = state.players.some((p: any) => p.chosenSlot === slot);
  if (taken) return;

  const p = getPlayer(state, client.user.id);
  if (!p) return;
  if (typeof p.chosenSlot === "number") return;

  // Draft order: only the lowest standby slot may pick next
  const unchosen = state.players.filter((pl: any) => typeof pl.chosenSlot !== "number");
  const nextStandby = Math.min(...unchosen.map((pl: any) => pl.standbySlot ?? 99));
  if ((p.standbySlot ?? 99) !== nextStandby) return;

  // Cannot pick the mirrored forbidden slot (turnSlot != 5 - standbySlot)
  const forbiddenTurnSlot = 5 - (p.standbySlot ?? 0);
  if (slot === forbiddenTurnSlot) return;

  // If not placed yet, a valid spawn selection is required
  if (!p.position) {
    const allowed = [
      { x: -2, y: -1 },
      { x: 2, y: 1 },
      { x: -1, y: 2 },
      { x: 1, y: -2 }
    ];
    const valid =
      spawn &&
      allowed.some((a) => a.x === spawn.x && a.y === spawn.y) &&
      !state.players.some((pl: any) => pl.position && pl.position.x === spawn.x && pl.position.y === spawn.y);
    if (!valid) return;
    p.position = spawn;
    p.facing = "N";
  }

  // If a standby card exists, move it into hand
  if (p.standbyCard) {
    p.hand.push(p.standbyCard);
    p.standbyCard = null;
  }
  if (p.turnCardAttachment) {
    p.hand.push(p.turnCardAttachment);
    p.turnCardAttachment = null;
  }
  const handIdx = p.hand.indexOf(turnCardCode);
  if (handIdx < 0) return;
  p.hand.splice(handIdx, 1);
  p.turnCard = turnCardCode;

  p.chosenSlot = slot;

  // Slot bonuses
  if (slot === 1) {
    drawCard(p);
  } else if (slot === 2) {
    p.mp += 1;
  } else if (slot === 3) {
    drawCard(p);
    // Require an explicit return card when possible; fallback to the last card in hand
    if (p.hand.length > 0) {
      const idx =
        returnCardCode && p.hand.includes(returnCardCode) ? p.hand.indexOf(returnCardCode) : p.hand.length - 1;
      const card = p.hand.splice(Math.max(0, idx), 1)[0];
      if (card) {
        p.deck.push(card);
      }
    }
  } else if (slot === 4) {
    // Optional 0~1 step move instead of CP gain
    if (p.position) {
      const wrappedTarget = moveTarget ? wrapPosition(moveTarget) : p.position;
      const dist = manhattanWrapped(wrappedTarget, p.position);
      const canStay = dist === 0;
      const canStep = dist === 1;
      const occupied = !canStay && isOccupied(state, p, wrappedTarget);
      if (!occupied && (canStay || canStep)) {
        if (canStep) {
          p.facing = directionFromTo(p.position, wrappedTarget);
        }
        p.position = wrappedTarget;
        collectShards(state, p, p.position);
      }
    }
  }

  progress(state);
  broadcastState(state);
}

export function handlePvpPickEnhanced(client: AuthedClient, roomId: string, cardCode: string, _roomClients: AuthedClient[]) {
  const state = rooms.get(roomId);
  if (!state) return;
  if (state.finished) return;

  const p = getPlayer(state, client.user.id);
  if (!p) return;
  if (p.needsEnhancedPick !== true) return;
  if (!Array.isArray(p.enhancedOptions) || !p.enhancedOptions.includes(cardCode)) return;

  // add chosen enhanced card, shuffle deck, keep hand empty for draw phase
  const deckCodes = Array.isArray(p.deck) ? p.deck.slice() : [];
  deckCodes.push(cardCode);
  p.deck = shuffle(deckCodes);
  p.hand = [];
  p.discard = [];
  p.needsEnhancedPick = false;
  p.enhancedOptions = [];
  if (Array.isArray(p.enhancedDeck)) {
    p.enhancedDeck = p.enhancedDeck.filter((c: string) => c !== cardCode);
  }

  progress(state);
  broadcastState(state);
}

export function handlePvpPlayCard(
  client: AuthedClient,
  roomId: string,
  cardCode: string,
  dir: Facing | undefined,
  _roomClients: AuthedClient[]
) {
  const ctx = getActionContext(roomId, client.user.id);
  if (!ctx) return;
  const { state, player: p, isReaction } = ctx;
  if (!p.position) return;

  if (isReaction) {
    sendError(client.ws, "Use the reaction flow to play reaction cards.");
    return;
  }

  if (dir) {
    p.facing = dir;
  }

  const idx = p.hand.indexOf(cardCode);
  if (idx < 0) return;

  const d = cardDef(cardCode);
  if (!canPayForCard(p, d)) return;
  // Keep the turn active so the player can chain actions; endTurn advances the queue

  const cardType = (d.cardType ?? "support").toLowerCase();
  const isAttackType = cardType === "attack" || cardType === "attackmagic";
  const isSupportType = cardType === "support" || cardType === "supportmagic";
  const baseRange = d.range ?? [];
  const baseAtk = (d.damage ?? 0) + (p.crackAtkBonus ?? 0);
  const code = cardCode;
  const priorAttackCount = p.attacksPlayedThisTurn ?? 0;
  const priorSupportCount = p.supportsPlayedThisTurn ?? 0;

  if (code === "HacKClaD_Mia_Delta_Cards_Heelstomp" && p.miaHeelstompExtra === undefined) {
    const hasKunai = p.hand.some(
      (c: string) => c === "HacKClaD_Mia_Delta_Cards_Kunai" || c === "HacKClaD_Mia_Delta_Cards_Kunai2"
    );
    if (hasKunai) {
      requestChoice(
        state,
        _roomClients,
        client.user.id,
        "miaHeelstompExtra",
        { cardCode, dir },
        "Heelstomp: 쿠나이를 버리고 공격력 +1 및 넉백을 얻을까요?",
        false
      );
      return;
    }
  }

  applyCardEconomy(p, d);

  if (isAttackType && baseRange.length > 0 && baseAtk > 0) {
    let atk = baseAtk;
    const frontAttack = isFacingBossFront(state, p);
    const backAttack = isFacingBossBack(state, p);
    let shouldRepel = false;
    let forceBossHit = false;
    const baseMulti = Math.max(1, d.multistrike ?? MULTISTRKE_FALLBACK[code] ?? 1);
    const bonusMulti = Math.max(0, p.nextAttackMultistrike ?? 0);
    const multistrike = Math.max(baseMulti, bonusMulti);
    const destroyedLegions: Vec2[] = [];

    if (p.nextAttackBonus) {
      atk += p.nextAttackBonus;
      p.nextAttackBonus = 0;
    }
    if (p.nextAttackMultistrike) {
      p.nextAttackMultistrike = 0;
    }
    if (p.nextAttackAlwaysInRange) {
      forceBossHit = true;
      p.nextAttackAlwaysInRange = false;
    }

    if (code === "HacKClaD_Rosette_Delta_Cards_Riposte" && frontAttack) {
      atk += 1;
      const top = p.deck.shift();
      if (top) p.discard.push(top);
    } else if (code === "HacKClaD_Rosette_Delta_Cards_Reversal" && (p.injury ?? 0) >= 5) {
      atk += 1;
      shouldRepel = true;
    } else if (code === "HacKClaD_Rosette_Delta_Cards_VitalBlow" && frontAttack) {
      shouldRepel = true;
    }

    if (code === "HacKClaD_Flare_Delta_Cards_Cannonade" && !p.movedThisTurn) {
      atk += 1;
      p.cannotMoveThisTurn = true;
    }
    if (code === "HacKClaD_Flare_Delta_Cards_LightpulsarPayload") {
      const cpSpend = Math.max(0, p.cp ?? 0);
      atk += cpSpend;
      p.cp = Math.max(0, (p.cp ?? 0) - cpSpend);
    }
    if (code === "HacKClaD_Flare_Delta_Cards_LeadDownpour" && (p.cp ?? 0) >= 3) {
      p.cp -= 3;
      atk += 1;
    }
    if (code === "HacKClaD_Flare_Delta_Cards_ConcussionSalvo") {
      state.bossMoveLockedRound = true;
    }

    if (code === "HacKClaD_Luna_Delta_Cards_RuinBlade") {
      if (forceBossHit || isBossInRange(state, p, baseRange)) {
        atk += 1;
      }
    }
    if (code === "HacKClaD_Luna_Delta_Cards_Thunderbolt" && priorAttackCount > 0) {
      atk += 1;
    }
    if (
      code === "HacKClaD_Luna_Delta_Cards_Condemn" ||
      code === "HacKClaD_Luna_Delta_Cards_EverchangingMagatama"
    ) {
      if (bossTopIsVoltageOneOrEmpty(state)) {
        atk += 1;
      }
    }
    if (code === "HacKClaD_Luna_Delta_Cards_Takemikazuchi") {
      atk += Math.max(0, priorSupportCount);
    }

    if (code === "HacKClaD_Mia_Delta_Cards_Heelstomp") {
      const useBonus = p.miaHeelstompExtra === true;
      p.miaHeelstompExtra = undefined;
      if (useBonus) {
        const kunaiIdx = p.hand.findIndex(
          (c: string) => c === "HacKClaD_Mia_Delta_Cards_Kunai" || c === "HacKClaD_Mia_Delta_Cards_Kunai2"
        );
        if (kunaiIdx >= 0) {
          const discarded = p.hand.splice(kunaiIdx, 1)[0];
          if (discarded) {
            p.discard.push(discarded);
            atk += 1;
            shouldRepel = true;
          }
        }
      }
    }

    if (code === "HacKClaD_Rosette_Delta_Cards_Ratetsu" || code === "HacKClaD_Rosette_Delta_Cards_Lunge") {
      p.injury = (p.injury ?? 0) + 1;
    }

    const bossOnly = code === "HacKClaD_Luna_Delta_Cards_HeavenlySwordOfGatheringClouds";
    const canResolveBossOnly = !bossOnly || forceBossHit || isBossInRange(state, p, baseRange);
    if (canResolveBossOnly) {
      for (let i = 0; i < multistrike; i++) {
        performBossAttack(
          state,
          p,
          baseRange,
          atk,
          shouldRepel && p.position
            ? { repelFrom: p.position, forceBossHit, skipLegions: bossOnly, destroyed: destroyedLegions }
            : { forceBossHit, skipLegions: bossOnly, destroyed: destroyedLegions }
        );
      }
    }

    if (code === "HacKClaD_Mia_Delta_Cards_Stealth" && backAttack && !p.miaStealthUsedRound) {
      drawCard(p);
      p.miaStealthUsedRound = true;
    }
    if (code === "HacKClaD_Mia_Delta_Cards_Mawashigeri" && backAttack) {
      flipTrapFaceUp(p);
    }
    if (code === "HacKClaD_Mia_Delta_Cards_WeaponForaging") {
      const kunaiCodes = ["HacKClaD_Mia_Delta_Cards_Kunai", "HacKClaD_Mia_Delta_Cards_Kunai2"];
      const recovered = p.discard.filter((c: string) => kunaiCodes.includes(c));
      if (recovered.length > 0) {
        p.discard = p.discard.filter((c: string) => !kunaiCodes.includes(c));
        p.hand.push(...recovered);
      }
    }

    if (code === "HacKClaD_Rosette_Delta_Cards_Impale" && (p.cp ?? 0) >= 1 && p.position) {
      requestChoice(
        state,
        _roomClients,
        client.user.id,
        "impale",
        {},
        "Impale: spend 1 CP to turn the Clad to face you?",
        false
      );
    }
    if (code === "HacKClaD_Luna_Delta_Cards_Thunderstep" && destroyedLegions.length > 0) {
      const uniqueTargets = destroyedLegions.filter(
        (pos, idx, arr) => arr.findIndex((t) => t.x === pos.x && t.y === pos.y) === idx
      );
      const movableTargets = uniqueTargets.filter((pos) => !isOccupied(state, p, pos));
      if (movableTargets.length > 0) {
        requestChoice(
          state,
          _roomClients,
          client.user.id,
          "lunaThunderstepMove",
          { targets: movableTargets },
          "Thunderstep: move to the defeated Legion's space?",
          false
        );
      }
    }
    p.attacksPlayedThisTurn = (p.attacksPlayedThisTurn ?? 0) + 1;
  } else if (isSupportType) {
    // simple support handling for Rosette move/turn utilities
    if (typeof d.move === "number" && d.move > 0 && p.position) {
      const facing = ensureFacing(p.facing);
      const delta = rotateOffset({ x: 0, y: 1 }, facing);
      attemptMove(state, p, delta);
    }

    if (code === "HacKClaD_Rosette_Delta_Cards_Challenge" && p.position) {
      const bossPos = bossPosition(state);
      const adjacent = Math.abs(bossPos.x - p.position.x) + Math.abs(bossPos.y - p.position.y) === 1;
      if (!adjacent) {
        sendError(client.ws, "Must be adjacent to use Challenge.");
      } else {
        state.boss.facing = directionFromTo(bossPos, p.position);
      }
    }
    if (code === "HacKClaD_Flare_Delta_Cards_GantryShield") {
      performIntercept(state, p, 2);
    }
    if (code === "HacKClaD_Flare_Delta_Cards_SteadyPositions") {
      p.onceGuard = Math.max(p.onceGuard ?? 0, 2);
      if (!p.movedThisTurn) {
        p.cp = (p.cp ?? 0) + 1;
        markDoneAndAdvance(state);
      }
    }
    if (code === "HacKClaD_Flare_Delta_Cards_DesignatedFirePoint") {
      p.cannotMoveThisTurn = true;
      p.nextAttackBonus = (p.nextAttackBonus ?? 0) + 1;
      p.nextAttackAlwaysInRange = true;
    }
    if (code === "HacKClaD_Luna_Delta_Cards_Tsukuyomi") {
      performDivination(state, p);
    }
    if (code === "HacKClaD_Luna_Delta_Cards_ChasingMelody") {
      p.nextAttackMultistrike = Math.max(p.nextAttackMultistrike ?? 0, 2);
    }
    if (code === "HacKClaD_Luna_Delta_Cards_Invocation") {
      const supportIdx = p.discard.findIndex((c: string) => {
        const def = cardDef(c);
        const t = (def.cardType ?? "").toLowerCase();
        return t === "support" || t === "supportmagic";
      });
      if (supportIdx >= 0) {
        const picked = p.discard.splice(supportIdx, 1)[0];
        if (picked) p.hand.push(picked);
      }
      p.nextAttackBonus = (p.nextAttackBonus ?? 0) + 1;
    }
    if (code === "HacKClaD_Luna_Delta_Cards_AuxillaryMana") {
      if ((p.mp ?? 0) >= 1) {
        requestChoice(
          state,
          _roomClients,
          client.user.id,
          "lunaAuxDivination",
          {},
          "Auxillary Mana: spend 1 MP to perform Divination?",
          false
        );
      }
    }
    if (code === "HacKClaD_Luna_Delta_Cards_SoaringHeights") {
      performDivination(state, p);
      const bossPos = bossPosition(state);
      const offsets = [
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: -1, y: 0 }
      ];
      const targets = offsets
        .map((o) => wrapPosition({ x: bossPos.x + o.x, y: bossPos.y + o.y }))
        .filter((pos) => !isOccupied(state, p, pos));
      if (targets.length > 0) {
        requestChoice(
          state,
          _roomClients,
          client.user.id,
          "lunaSoaringHeightsMove",
          { targets },
          "Soaring Heights: move to an adjacent space?",
          false
        );
      }
    }
    if (code === "HacKClaD_Mia_Delta_Cards_SummonTrap") {
      if (!flipTrapFaceUp(p)) {
        sendError(client.ws, "No face-down Conibear Trap to flip.");
      }
    }
    if (code === "HacKClaD_Mia_Delta_Cards_IllusoryArts" && p.position) {
      const bossPos = bossPosition(state);
      const adjacent = Math.abs(bossPos.x - p.position.x) + Math.abs(bossPos.y - p.position.y) === 1;
      if (!adjacent) {
        sendError(client.ws, "Must be adjacent to use Illusory Arts.");
      } else {
        state.boss.facing = reverseFacing(directionFromTo(bossPos, p.position));
      }
    }
    if (code === "HacKClaD_Mia_Delta_Cards_AuxillaryMana") {
      if ((p.mp ?? 0) >= 1) {
        if (ensureMiaTraps(p).some((t) => !t)) {
          requestChoice(
            state,
            _roomClients,
            client.user.id,
            "miaAuxTrapFlip",
            {},
            "Auxillary Mana: MP 1을 지불해 코니베어 트랩을 앞면으로 뒤집을까요?",
            false
          );
        } else {
          sendError(client.ws, "No face-down Conibear Trap to flip.");
        }
      }
    }
    if (code === "HacKClaD_Mia_Delta_Cards_Tsujigiri") {
      if (p.cannotMoveThisTurn) {
        sendError(client.ws, "Cannot move right now.");
      } else if (p.position) {
        const facing = ensureFacing(p.facing);
        const step = rotateOffset({ x: 0, y: 1 }, facing);
        const path = [
          wrapPosition({ x: p.position.x + step.x, y: p.position.y + step.y }),
          wrapPosition({ x: p.position.x + step.x * 2, y: p.position.y + step.y * 2 })
        ];
        for (const pos of path) {
          const bossPos = bossPosition(state);
          if (pos.x === bossPos.x && pos.y === bossPos.y) {
            dealBossDamage(state, 2, p);
          }
          damageLegionAt(state, pos, 2, p);
          collectShards(state, p, pos);
        }
        const finalPos = path[1];
        if (!isOccupied(state, p, finalPos)) {
          p.facing = directionFromTo(p.position, finalPos);
          p.position = finalPos;
          p.movedThisTurn = true;
        } else {
          sendError(client.ws, "Cannot move to the target space.");
        }
      }
    }
    if (UNYIELDING_CARDS.has(code)) {
      activateUnyielding(p);
    }
    if (code === "HacKClaD_Rosette_Delta_Cards_HundredDemons") {
      requestChoice(
        state,
        _roomClients,
        client.user.id,
        "nightParade",
        {},
        "Discard the top card; you may play it. Gain an extra Crack use this turn. Proceed?",
        false
      );
      broadcastState(state);
      // discard immediately to avoid double-play
      discardFromHand(p, cardCode);
      p.supportsPlayedThisTurn = (p.supportsPlayedThisTurn ?? 0) + 1;
      return;
    }
    if (isLuna(p) && !LUNA_SUPPORT_DIVINATION_CARDS.has(code)) {
      performDivination(state, p);
    }
    p.supportsPlayedThisTurn = (p.supportsPlayedThisTurn ?? 0) + 1;
  }

  if (cardType === "reaction" && code === "HacKClaD_Flare_Delta_Cards_Logistics") {
    p.tempGuard = (p.tempGuard ?? 0) + 2;
    if (p.discard.length > 0) {
      const picked = p.discard.pop();
      if (picked) {
        p.hand.push(picked);
      }
    } else {
      drawCard(p);
    }
  }

  if (cardType === "reaction" && typeof d.guard === "number") {
    p.tempGuard = (p.tempGuard ?? 0) + d.guard;
    if (UNYIELDING_CARDS.has(code)) {
      activateUnyielding(p);
    }
  }

  // move card
  discardFromHand(p, cardCode);

  if (cardCode === "HacKClaD_Mia_Delta_Cards_Shuriken" && p.turnCard) {
    const idx = p.discard.indexOf(cardCode);
    if (idx >= 0) {
      p.discard.splice(idx, 1);
      p.turnCardAttachment = cardCode;
    }
  }

  // keep the turn active so the player can chain more cards/skills;
  // advancing the queue is handled explicitly via endTurn.
  broadcastState(state);
}

export function handlePvpMiaTrapAttack(
  client: AuthedClient,
  roomId: string,
  target: { kind: "boss" | "legion"; pos?: Vec2 },
  _roomClients: AuthedClient[]
) {
  const ctx = getActionContext(roomId, client.user.id, { allowReaction: false });
  if (!ctx) return;
  const { state, player: p } = ctx;

  if (!isMia(p)) {
    sendError(client.ws, "Only Mia can use Conibear Traps.");
    return;
  }
  if (!flipTrapFaceDown(p)) {
    sendError(client.ws, "No face-up Conibear Trap to flip.");
    return;
  }

  if (target?.kind === "boss") {
    dealBossDamage(state, 1, p);
  } else if (target?.kind === "legion" && target.pos) {
    const wrapped = wrapPosition(target.pos);
    const legion = (state.legions ?? []).some((l: Legion) => l.position.x === wrapped.x && l.position.y === wrapped.y);
    if (!legion) {
      sendError(client.ws, "Legion not found.");
      return;
    }
    damageLegionAt(state, wrapped, 1, p);
  } else {
    sendError(client.ws, "Invalid trap target.");
    return;
  }

  p.supportsPlayedThisTurn = (p.supportsPlayedThisTurn ?? 0) + 1;
  broadcastState(state);
}

// --------------------
// basic / cp / react placeholders
// --------------------
export function handlePvpBasicAction(
  client: AuthedClient,
  roomId: string,
  action: "move" | "mp" | "dmgReduce",
  dir: "N" | "E" | "S" | "W" | undefined,
  discardCard: string | undefined,
  _roomClients: AuthedClient[]
) {
  const ctx = getActionContext(roomId, client.user.id);
  if (!ctx) return;
  const { state, player: p } = ctx;
  if (!p.position) return;
  const isReaction = !!state.reaction && state.reaction.active === client.user.id;

  const uses = p.basicUses ?? { move: 0, mp: 0, dmgReduce: 0 };
  const limits = basicLimitsFor(p);
  if (uses[action] >= limits[action]) {
    sendError(client.ws, "Basic action limit reached.");
    return;
  }

  if (action === "move" && p.cannotMoveThisTurn) {
    sendError(client.ws, "Cannot move right now.");
    return;
  }

  if (!p.hand || p.hand.length === 0) {
    sendError(client.ws, "No card to discard.");
    return;
  }
  const chosen = discardCard ?? p.hand[0];
  if (!discardFromHand(p, chosen)) {
    sendError(client.ws, "Discard target not found in hand.");
    return;
  }

  if (chosen === "HacKClaD_Mia_Delta_Cards_ConvergenceSeal") {
    if (!p.convergenceSealUsedTurn && (p.damageDealtTurn ?? 0) >= 4) {
      dealBossDamage(state, 3, p);
      p.convergenceSealUsedTurn = true;
    }
  }

  if (action === "move") {
    if (!dir) {
      sendError(client.ws, "Choose a direction.");
      return;
    }
    if (!attemptDirectionalMove(state, p, dir)) {
      sendError(client.ws, "Cannot move in that direction.");
      return;
    }
  } else if (action === "mp") {
    p.mp = (p.mp ?? 0) + 1;
  } else if (action === "dmgReduce") {
    p.tempGuard = (p.tempGuard ?? 0) + 1;
    if (INTERCEPT_ON_DISCARD[chosen]) {
      performIntercept(state, p, INTERCEPT_ON_DISCARD[chosen]);
    }
    if (chosen === "HacKClaD_Flare_Delta_Cards_MaelstromFormation") {
      p.cp = (p.cp ?? 0) + 1;
    }
  }

  uses[action] = (uses[action] ?? 0) + 1;
  p.basicUses = uses;

  if (isReaction) {
    maybeTriggerMaelstrom(state, p, 0);
  }

  broadcastState(state);
}

export function handlePvpCpAction(
  client: AuthedClient,
  roomId: string,
  actionId: string,
  target: { x: number; y: number } | undefined,
  dir: "N" | "E" | "S" | "W" | undefined,
  _roomClients: AuthedClient[]
) {
  const ctx = getActionContext(roomId, client.user.id);
  if (!ctx) return;
  const { state, player: p, isReaction } = ctx;

  const def = CP_ACTIONS[actionId];
  if (!def) {
    sendError(client.ws, "Unknown CP action.");
    return;
  }
  if (isReaction && def.timing !== "reaction") {
    sendError(client.ws, "This CP action cannot be used during a reaction.");
    return;
  }
  if (!isReaction && def.timing === "reaction") {
    sendError(client.ws, "This CP action is reaction-only.");
    return;
  }
  if ((p.cp ?? 0) < def.cost) {
    sendError(client.ws, "Not enough CP.");
    return;
  }
  p.cp -= def.cost;

  if (def.effect === "guard") {
    p.tempGuard = (p.tempGuard ?? 0) + 1;
  } else if (def.effect === "move") {
    if (!p.position) return;
    if (p.cannotMoveThisTurn) {
      sendError(client.ws, "Cannot move right now.");
      return;
    }
    if (!dir) {
      sendError(client.ws, "Choose a direction.");
      return;
    }
    if (!attemptDirectionalMove(state, p, dir)) {
      sendError(client.ws, "Cannot move in that direction.");
      return;
    }
  } else if (def.effect === "mp") {
    p.mp = (p.mp ?? 0) + 1;
  } else if (def.effect === "draw") {
    drawCard(p);
  }

  broadcastState(state);
}

export function handlePvpReact(
  client: AuthedClient,
  roomId: string,
  kind: "playCard" | "basicAction" | "cpAction" | "crack" | "pass",
  payload: any,
  _roomClients: AuthedClient[]
) {
  const state = rooms.get(roomId);
  if (!state) return;
  if (!state.reaction || state.reaction.active !== client.user.id) {
    sendError(client.ws, "Not your reaction turn.");
    return;
  }

  const p = getPlayer(state, client.user.id);
  if (!p) return;

  if (kind === "pass") {
    state.reaction.passed = Array.from(new Set([...(state.reaction.passed ?? []), client.user.id]));
    // Find the next eligible reactor
    const next = state.reaction.eligible.find((id: string) => !state.reaction.passed.includes(id));
    if (next) {
      state.reaction.active = next;
    } else {
      const ctxType = state.reaction.context?.type;
      if (ctxType === "bossAttack") {
        const pending = state.bossPending as BossPending | undefined;
        if (pending) {
          const targets = eligiblePlayersForAttack(state, pending);
          for (const id of targets) {
            const target = getPlayer(state, id);
            if (target) applyDamageToPlayer(state, target, pending.damage);
          }
        }
        state.reaction = null;
        resumeBossAfterReaction(state);
      } else if (ctxType === "legionAttack") {
        applyLegionPendingDamage(state);
        state.reaction = null;
        state.actionIndex = (state.actionIndex ?? 0) + 1;
        advanceTurn(state);
      } else {
        state.reaction = null;
      }
    }
    broadcastState(state);
    return;
  }

  if (kind === "cpAction") {
    handlePvpCpAction(client, roomId, payload?.actionId, payload?.target, payload?.dir, _roomClients);
    refreshReactionEligibility(state);
    broadcastState(state);
    return;
  }

  if (kind === "crack") {
    handlePvpCrack(client, roomId, payload?.dir, payload?.steps, payload?.moveTarget ?? null, _roomClients, {
      allowReaction: true
    });
    refreshReactionEligibility(state);
    broadcastState(state);
    return;
  }

  if (kind === "basicAction") {
    handlePvpBasicAction(client, roomId, payload?.action, payload?.dir, payload?.discardCard, _roomClients);
    refreshReactionEligibility(state);
    broadcastState(state);
    return;
  }

  if (kind === "playCard") {
    const cardCode = payload?.cardCode;
    const dir = payload?.dir as Facing | undefined;
    if (typeof cardCode !== "string") {
      sendError(client.ws, "카드가 필요합니다.");
      return;
    }
    const idx = p.hand.indexOf(cardCode);
    if (idx < 0) {
      sendError(client.ws, "손패에 없는 카드입니다.");
      return;
    }
    const d = cardDef(cardCode);
    const code = cardCode;
    if (!canPayForCard(p, d)) {
      sendError(client.ws, "MP가 부족합니다.");
      return;
    }
    if (dir) {
      p.facing = dir;
    }
    if (isReactionCardDef(d, code)) {
      d.cardType = "reaction";
    }
    const cardType = d.cardType ?? "support";
    if (cardType !== "reaction") {
      sendError(client.ws, "반응 전용 카드입니다.");
      return;
    }
    // pay
    applyCardEconomy(p, d);

    if (code === "HacKClaD_Mia_Delta_Cards_Substitute") {
      const target = payload?.target as Vec2 | undefined;
      if (!p.position) {
        sendError(client.ws, "No position for Substitute.");
        return;
      }
      if (!target) {
        sendError(client.ws, "Choose a target space for Substitute.");
        return;
      }
      if (!flipTrapFaceDown(p)) {
        sendError(client.ws, "No face-up Conibear Trap to flip.");
        return;
      }
      const wrapped = wrapPosition(target);
      if (isOccupied(state, p, wrapped)) {
        sendError(client.ws, "Target space is occupied.");
        return;
      }
      p.facing = directionFromTo(p.position, wrapped);
      p.position = wrapped;
      p.movedThisTurn = true;
      collectShards(state, p, p.position);
    }

    if (code === "HacKClaD_Flare_Delta_Cards_Logistics") {
      p.tempGuard = (p.tempGuard ?? 0) + 2;
      if (p.discard.length > 0) {
        const picked = p.discard.pop();
        if (picked) {
          p.hand.push(picked);
        }
      } else {
        drawCard(p);
      }
    }

    if (typeof d.guard === "number") {
      p.tempGuard = (p.tempGuard ?? 0) + d.guard;
    }
    if (code === "HacKClaD_Luna_Delta_Cards_OctspanMirror") {
      const bossFacing = ensureFacing(state.boss?.facing ?? "N");
      state.boss.facing = reverseFacing(bossFacing);
    }
    let reactionAtk = d.damage ?? 0;
    let forceBossHit = false;
    if (p.nextAttackBonus) {
      reactionAtk += p.nextAttackBonus;
      p.nextAttackBonus = 0;
    }
    if (p.nextAttackAlwaysInRange) {
      forceBossHit = true;
      p.nextAttackAlwaysInRange = false;
    }
    if ((d.range?.length ?? 0) > 0 && reactionAtk > 0) {
      performBossAttack(
        state,
        p,
        d.range ?? [],
        reactionAtk,
        p.position ? { repelFrom: p.position, forceBossHit } : { forceBossHit }
      );
    }

    if (UNYIELDING_CARDS.has(code)) {
      activateUnyielding(p);
    }

    discardFromHand(p, cardCode);
    maybeTriggerMaelstrom(state, p, 0);
    refreshReactionEligibility(state);
    broadcastState(state);
  }
}

export function handlePvpCrack(
  client: AuthedClient,
  roomId: string,
  dir: "N" | "E" | "S" | "W" | undefined,
  steps: number | undefined,
  moveTarget: { x: number; y: number } | null,
  roomClients: AuthedClient[],
  opts?: { allowReaction?: boolean }
) {
  const ctx = getActionContext(roomId, client.user.id, { allowReaction: opts?.allowReaction !== false });
  if (!ctx) return;
  const { state, player: p, isReaction } = ctx;
  if (!p.position) return;

  if (isReaction && !isFlare(p)) {
    sendError(client.ws, "Only Flare can use Crack as a reaction.");
    return;
  }

  // Flare-\u0394: Hope's Beacon (Reaction) - 1CP, once per round: corruption +1, guard 2, 요격 3
  if (isFlare(p)) {
    if ((p.crackUsedRound ?? 0) >= 1) {
      sendError(client.ws, "Hope's Beacon can only be used once per round.");
      return;
    }
    if ((p.cp ?? 0) < 1) {
      sendError(client.ws, "Not enough CP for Hope's Beacon (requires 1).");
      return;
    }
    p.cp -= 1;
    p.corruption = (p.corruption ?? 0) + 1;
    p.tempGuard = (p.tempGuard ?? 0) + 2;
    performIntercept(state, p, 3);
    p.crackUsedTurn = (p.crackUsedTurn ?? 0) + 1;
    p.crackUsedRound = (p.crackUsedRound ?? 0) + 1;
    broadcastState(state);
    return;
  }

  if (isLuna(p)) {
    if ((p.crackUsedRound ?? 0) >= 1) {
      sendError(client.ws, "Innveration Kagura can only be used once per round.");
      return;
    }
    if ((p.cp ?? 0) < 1) {
      sendError(client.ws, "Not enough CP for Innveration Kagura (requires 1).");
      return;
    }
    p.cp -= 1;
    p.corruption = (p.corruption ?? 0) + 1;
    p.mp = (p.mp ?? 0) + 5;
    performDivination(state, p);
    p.crackUsedTurn = (p.crackUsedTurn ?? 0) + 1;
    p.crackUsedRound = (p.crackUsedRound ?? 0) + 1;
    broadcastState(state);
    return;
  }

  if (isMia(p)) {
    if ((p.crackUsedRound ?? 0) >= 1) {
      sendError(client.ws, "Lykos Shinobi can only be used once per round.");
      return;
    }
    if ((p.cp ?? 0) < 1) {
      sendError(client.ws, "Not enough CP for Lykos Shinobi (requires 1).");
      return;
    }
    if ((p.damageDealtRound ?? 0) < 3) {
      sendError(client.ws, "Lykos Shinobi requires 3+ damage dealt this round.");
      return;
    }
    p.cp -= 1;
    p.corruption = (p.corruption ?? 0) + 1;
    p.miaShardBonusRound = true;
    p.crackUsedTurn = (p.crackUsedTurn ?? 0) + 1;
    p.crackUsedRound = (p.crackUsedRound ?? 0) + 1;
    broadcastState(state);
    return;
  }

  // Rosette: require CP 1
  if (isRosette(p)) {
    if ((p.cp ?? 0) < 1) {
      sendError(client.ws, "Not enough CP for Crack (requires 1).");
      return;
    }
    p.cp -= 1;
  }

  if (p.cannotMoveThisTurn) {
    sendError(client.ws, "Cannot move right now.");
    return;
  }

  const limit = 1 + (p.crackBonus ?? 0);
  if ((p.crackUsedTurn ?? 0) >= limit) {
    sendError(client.ws, "Crack uses for this turn are exhausted.");
    return;
  }
  // Optional 0~1 move (stay or adjacent tile)
  if (moveTarget) {
    const wrapped = wrapPosition(moveTarget);
    const dist = manhattanWrapped(wrapped, p.position);
    const occupied = dist === 1 && isOccupied(state, p, wrapped);
    if (dist > 1 || occupied) {
      sendError(client.ws, "Invalid Crack move target.");
      return;
    }
    if (dist === 1) {
      p.facing = directionFromTo(p.position, wrapped);
      p.position = wrapped;
      collectShards(state, p, p.position);
    }
  }

  if (dir) {
    p.facing = dir;
  }

  p.corruption = (p.corruption ?? 0) + 1;
  p.crackAtkBonus = (p.crackAtkBonus ?? 0) + 1;

  const sweepIdx = p.discard.indexOf("HacKClaD_Rosette_Delta_Cards_Sweep");
  if (sweepIdx >= 0) {
    const sweepCode = p.discard.splice(sweepIdx, 1)[0];
    p.hand.push(sweepCode);
  }

  broadcastState(state);
}

export function handlePvpEndTurn(client: AuthedClient, roomId: string, _roomClients: AuthedClient[]) {
  let ctx = getActionContext(roomId, client.user.id, { allowReaction: false });
  if (!ctx) {
    const state = rooms.get(roomId);
    if (!state || state.phase !== "action" || state.finished) return;
    if (state.currentTurn?.type === "player" && state.currentTurn.userId === client.user.id) {
      ctx = { state, player: getPlayer(state, client.user.id), isReaction: false, isMyTurn: true };
    }
  }
  if (!ctx?.isMyTurn) return;
  const { state } = ctx;

  markDoneAndAdvance(state);
  broadcastState(state);
}

export function handleAdvancePhaseDebug(roomId: string, _roomClients: AuthedClient[]) {
  const state = rooms.get(roomId);
  if (!state) return;
  if (state.finished) return;

  if (state.phase === "forecast") state.phase = "draw";
  else if (state.phase === "draw") state.phase = "draft";
  else if (state.phase === "draft") state.phase = "action";
  else if (state.phase === "action") endRoundOrScore(state);

  progress(state);
  broadcastState(state);
}
