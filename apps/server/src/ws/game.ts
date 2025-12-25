// apps/server/src/ws/game.ts
import type { AuthedClient } from "./state.js";
import { rooms, broadcastRoomState, sendError } from "./state.js";

// NOTE: prisma는 아직 MVP 로직에 사용하지 않아서 제거(경고 방지)
// import { prisma } from "../db/prisma";

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

// 아주 단순 카드 정의(MVP). 나중에 DB/JSON으로 교체.
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
    vpCard: 0,
  },
};

function cardDef(code: string) {
  return CARD_DB[code] ?? CARD_DB.C_BASIC_STRIKE;
}

// 덱 비면 discard 섞어서 reform + cp +1
function reformIfNeeded(p: any) {
  if (p.deck.length > 0) return;
  if (p.discard.length === 0) return;

  p.deck = shuffle(p.discard);
  p.discard = [];
  p.cp += 1;
}

function drawTo3(p: any) {
  while (p.hand.length < 3) {
    if (p.deck.length === 0) reformIfNeeded(p);
    if (p.deck.length === 0) break;
    p.hand.push(p.deck.shift());
  }
}

function allReady(state: any) {
  return state.players.every((p: any) => p.ready === true);
}

function allActed(state: any) {
  return state.players.every((p: any) => p.actedThisRound === true);
}

// phase 진행: foresight -> draw -> action -> (round++ 반복) -> scoring
function progress(state: any) {
  if (!allReady(state)) return;
  if (state.finished) return;

  // phase 이름을 실제 상태 값("foresight")과 맞춘다.
  if (state.phase === "foresight") {
    // 보스 foresight 1장 공개
    const top = state.boss.deck.shift();
    state.boss.foresight = top ? [top] : [];
    state.phase = "draw";
  }

  if (state.phase === "draw") {
    for (const p of state.players) {
      drawTo3(p);
      p.actedThisRound = false;
    }
    state.phase = "action";
  }

  if (state.phase === "action") {
    if (!allActed(state)) return;

    // (MVP) 라운드 끝 처리(임시): 전원 injury +1
    for (const p of state.players) p.injury += 1;

    if (state.round >= 9) {
      state.phase = "scoring";
      state.finished = true;
      return;
    }

    state.round += 1;
    state.phase = "foresight";
  }
}

function computeFinalScores(state: any) {
  return state.players
    .map((p: any) => {
      const allCodes = [...p.deck, ...p.discard, ...p.hand];
      const cardVp = allCodes.reduce((acc: number, code: string) => {
        return acc + cardDef(code).vpCard;
      }, 0);

      const finalVp = p.vp + cardVp - p.injury; // 미션 없음
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
export function handleGameSubscribe(
  client: AuthedClient,
  roomId: string,
  _roomClients: AuthedClient[]
) {
  console.log("[SUB] subscribe", roomId, "rooms.size=", rooms.size);
  console.log("[SUB] hasRoom?", rooms.has(roomId));
  const state = rooms.get(roomId);
  if (!state) {
    sendError(client.ws, "Room not found");
    return;
  }
  // 새 WS 연결로 들어올 때도 해당 room에 속해 있다고 표시해야 이후 broadcast 대상에 포함된다.
  client.roomId = roomId;
  console.log("[STATE] sent", roomId, "phase=", state.phase, "round=", state.round);
  broadcastRoomState(roomId, buildPayload(state));
}

export function handlePvpReady(
  client: AuthedClient,
  roomId: string,
  _roomClients: AuthedClient[]
) {
  const state = rooms.get(roomId);
  if (!state) return;

  const p = state.players.find((x: any) => x.userId === client.user.id);
  if (!p) return;

  p.ready = true;
  progress(state);

  broadcastRoomState(roomId, buildPayload(state));
}

export function handlePvpPlayCard(
  client: AuthedClient,
  roomId: string,
  cardCode: string,
  _roomClients: AuthedClient[]
) {
  const state = rooms.get(roomId);
  if (!state) return;
  if (state.phase !== "action" || state.finished) return;

  const p = state.players.find((x: any) => x.userId === client.user.id);
  if (!p) return;
  if (p.actedThisRound) return;

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

  p.actedThisRound = true;

  progress(state);
  broadcastRoomState(roomId, buildPayload(state));
}

export function handlePvpEndTurn(
  client: AuthedClient,
  roomId: string,
  _roomClients: AuthedClient[]
) {
  const state = rooms.get(roomId);
  if (!state) return;
  if (state.phase !== "action" || state.finished) return;

  const p = state.players.find((x: any) => x.userId === client.user.id);
  if (!p) return;

  p.actedThisRound = true;
  progress(state);

  broadcastRoomState(roomId, buildPayload(state));
}

export function handleAdvancePhaseDebug(
  roomId: string,
  _roomClients: AuthedClient[]
) {
  const state = rooms.get(roomId);
  if (!state) return;
  if (state.finished) return;

  // 디버그: 강제로 다음 phase로 넘기기
  if (state.phase === "foresight") state.phase = "draw";
  else if (state.phase === "draw") state.phase = "action";
  else if (state.phase === "action") state.phase = "foresight";

  progress(state);
  broadcastRoomState(roomId, buildPayload(state));
}
