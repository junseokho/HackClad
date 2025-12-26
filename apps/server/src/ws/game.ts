// apps/server/src/ws/game.ts
import type { AuthedClient } from "./state.js";
import { rooms, broadcastRoomState, sendError } from "./state.js";

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

// 플레이어 카드 정의(MVP). 추후 DB 연동 예정.
const CARD_DB: Record<
  string,
  {
    code: string;
    name: string;
    mpCost: number;
    damage: number;
    gainMp: number;
    gainCp: number;
    vpCard: number;
  }
> = {
  C_BASIC_STRIKE: {
    code: "C_BASIC_STRIKE",
    name: "Strike",
    mpCost: 0,
    damage: 2,
    gainMp: 0,
    gainCp: 0,
    vpCard: 0
  }
};

function cardDef(code: string) {
  return CARD_DB[code] ?? CARD_DB.C_BASIC_STRIKE;
}

// --------------------
// Clad Hydra data
// --------------------
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

type TurnStep =
  | { type: "player"; userId: string }
  | { type: "boss"; cardIndex: number; cardCode: string };

// --------------------
// deck helpers
// --------------------
function reformIfNeeded(p: any) {
  if (p.deck.length > 0) return;
  if (p.discard.length === 0) return;

  p.deck = shuffle(p.discard);
  p.discard = [];
  p.cp += 2; // 리폼 보상
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

function allReady(state: any) {
  return state.players.every((p: any) => p.ready === true);
}

function allSlotsChosen(state: any) {
  return state.players.every((p: any) => typeof p.chosenSlot === "number");
}

// --------------------
// Boss helpers
// --------------------
function rotateOffset(offset: Vec2, facing: Facing): Vec2 {
  const { x, y } = offset;
  if (facing === "N") return { x, y };
  if (facing === "E") return { x: y, y: -x };
  if (facing === "S") return { x: -x, y: -y };
  return { x: -y, y: x }; // W
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
  if (state.boss.deck.length === 0 && state.boss.discard?.length > 0) {
    state.boss.deck = shuffle(state.boss.discard);
    state.boss.discard = [];
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

function resolveBossCard(state: any, step: { cardCode: string }) {
  const card = CLAD_CARDS[step.cardCode];
  if (!card) return;

  state.voltage = (state.voltage ?? 0) + card.voltage;
  state.boss.voltage = state.voltage;

  let pos = state.boss.position ?? { x: 0, y: 0 };
  let facing: Facing = state.boss.facing ?? "N";

  for (const action of card.actions) {
    if (action.type === "move") {
      const delta = rotateOffset(action.offset, facing);
      pos = { x: pos.x + delta.x, y: pos.y + delta.y };
    } else if (action.type === "turn") {
      facing = turnFacing(facing, action.dir);
    } else if (action.type === "special" && action.kind === "homecoming") {
      pos = { x: 0, y: 0 };
      facing = "N";
    }
  }

  state.boss.position = pos;
  state.boss.facing = facing;

  // 간단 데미지: 공격 아이콘 수 * 현재 voltage -> 모든 플레이어 부상 증가
  const attackCount = card.actions.filter((a) => a.type === "attack").length;
  if (attackCount > 0) {
    const damage = state.boss.voltage ?? 0;
    for (const p of state.players) p.injury += damage;
  }
}

// --------------------
// Turn helpers
// --------------------
function buildActionQueue(state: any): TurnStep[] {
  const playersSorted = state.players
    .slice()
    .sort((a: any, b: any) => (a.chosenSlot ?? 10) - (b.chosenSlot ?? 10) || a.userId.localeCompare(b.userId));
  const queue: TurnStep[] = [];
  const bossCards = state.boss.foresight ?? [];
  const maxLen = Math.max(playersSorted.length, bossCards.length);
  for (let i = 0; i < maxLen; i++) {
    if (playersSorted[i]) queue.push({ type: "player", userId: playersSorted[i].userId });
    if (bossCards[i]) queue.push({ type: "boss", cardIndex: i, cardCode: bossCards[i] });
  }
  return queue;
}

function markDoneAndAdvance(state: any) {
  if (state.phase !== "action") return;
  state.actionIndex = (state.actionIndex ?? 0) + 1;
  advanceTurn(state);
}

function advanceTurn(state: any) {
  if (state.phase !== "action") return;
  if (!state.actionQueue) return;

  while (state.actionIndex < state.actionQueue.length) {
    const step = state.actionQueue[state.actionIndex];
    if (step.type === "boss") {
      resolveBossCard(state, step);
      state.actionIndex += 1;
      continue;
    }

    // player turn
    state.currentTurn = step;
    return;
  }

  // 큐 종료 -> 다음 라운드/스코어링
  endRoundOrScore(state);
}

function resetForNextRound(state: any) {
  for (const p of state.players) {
    p.ready = false;
    p.chosenSlot = undefined;
    p.actedThisRound = false;
  }
  state.boss.foresight = [];
  state.actionQueue = [];
  state.actionIndex = 0;
  state.currentTurn = null;
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
  // 다음 라운드 즉시 페이즈 검사
  progress(state);
}

// --------------------
// phase progression
// --------------------
function progress(state: any) {
  if (state.finished) return;
  if (!allReady(state)) return;

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

      const finalVp = p.vp + cardVp - p.injury;
      return { userId: p.userId, nickname: p.nickname, finalVp };
    })
    .sort((a: any, b: any) => b.finalVp - a.finalVp);
}

function buildPayload(state: any) {
  const payload: any = { ...state };
  if (state.phase === "scoring" && state.finished) {
    payload.finalScores = computeFinalScores(state);
  }
  return payload;
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
  broadcastRoomState(roomId, buildPayload(state));
}

export function handlePvpReady(client: AuthedClient, roomId: string, _roomClients: AuthedClient[]) {
  const state = rooms.get(roomId);
  if (!state) return;

  const p = state.players.find((x: any) => x.userId === client.user.id);
  if (!p) return;

  p.ready = true;
  progress(state);

  broadcastRoomState(roomId, buildPayload(state));
}

export function handlePvpChooseSlot(client: AuthedClient, roomId: string, slot: number, _roomClients: AuthedClient[]) {
  const state = rooms.get(roomId);
  if (!state) return;
  if (state.phase !== "draft" || state.finished) return;
  if (slot < 1 || slot > 4) return;

  const taken = state.players.some((p: any) => p.chosenSlot === slot);
  if (taken) return;

  const p = state.players.find((x: any) => x.userId === client.user.id);
  if (!p) return;
  if (typeof p.chosenSlot === "number") return;

  p.chosenSlot = slot;

  // 즉시 효과
  if (slot === 1) {
    drawCard(p);
  } else if (slot === 2) {
    p.mp += 1;
  } else if (slot === 3) {
    drawCard(p);
    if (p.hand.length > 0) {
      const card = p.hand.pop();
      if (card) p.deck.push(card);
    }
  } else if (slot === 4) {
    p.cp += 1;
  }

  progress(state);
  broadcastRoomState(roomId, buildPayload(state));
}

export function handlePvpPlayCard(client: AuthedClient, roomId: string, cardCode: string, _roomClients: AuthedClient[]) {
  const state = rooms.get(roomId);
  if (!state) return;
  if (state.phase !== "action" || state.finished) return;

  const turn = state.currentTurn;
  if (!turn || turn.type !== "player" || turn.userId !== client.user.id) return;

  const p = state.players.find((x: any) => x.userId === client.user.id);
  if (!p) return;

  const idx = p.hand.indexOf(cardCode);
  if (idx < 0) return;

  const d = cardDef(cardCode);
  if (p.mp < d.mpCost) return;

  // pay + gains
  p.mp -= d.mpCost;
  p.mp += d.gainMp;
  p.cp += d.gainCp;

  // damage -> boss hp + vp
  if (d.damage > 0) {
    state.boss.hp = Math.max(0, state.boss.hp - d.damage);
    p.vp += d.damage;
  }

  // move card
  p.hand.splice(idx, 1);
  p.discard.push(cardCode);

  // keep the turn active so the player can chain more cards/skills;
  // advancing the queue is handled explicitly via endTurn.
  broadcastRoomState(roomId, buildPayload(state));
}

export function handlePvpEndTurn(client: AuthedClient, roomId: string, _roomClients: AuthedClient[]) {
  const state = rooms.get(roomId);
  if (!state) return;
  if (state.phase !== "action" || state.finished) return;

  const turn = state.currentTurn;
  if (!turn || turn.type !== "player" || turn.userId !== client.user.id) return;

  markDoneAndAdvance(state);
  broadcastRoomState(roomId, buildPayload(state));
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
  broadcastRoomState(roomId, buildPayload(state));
}
