import { cardByCode, type GameState } from "./state.js";
import { drawToHandSize } from "./deck.js";

function allReady(s: GameState) {
  return s.players.every((p) => p.ready);
}

function allActed(s: GameState) {
  return s.players.every((p) => p.actedThisRound);
}

function bossForecast(s: GameState) {
  if (s.boss.deck.length === 0 && s.boss.discard.length > 0) {
    s.boss.deck = s.boss.discard;
    s.boss.discard = [];
  }
  const c = s.boss.deck.shift();
  if (c) {
    s.boss.foresight = [c.code];
    s.boss.discard.push(c);
  } else {
    s.boss.foresight = [];
  }
}

function bossAct(s: GameState) {
  const code = s.boss.foresight[0];
  if (!code) return;

  const card = s.boss.discard.find((x) => x.code === code);
  if (!card) return;

  s.boss.voltage += card.voltageDelta;
  for (const p of s.players) {
    p.injury += card.damageAll;
  }
}

function scoring(s: GameState) {
  const finalScores = s.players
    .map((p) => {
      const cardVp = p.deck.concat(p.discard).concat(p.hand).reduce((acc, code) => acc + cardByCode(code).vpCard, 0);
      const finalVp = p.vp + cardVp - p.injury;
      return { userId: p.userId, nickname: p.nickname, finalVp };
    })
    .sort((a, b) => b.finalVp - a.finalVp);

  return finalScores;
}

export function ensurePhaseProgress(s: GameState) {
  if (s.finished) return;

  if (!allReady(s)) return;

  if (s.phase === "forecast") {
    bossForecast(s);
    s.phase = "draw";
  }

  if (s.phase === "draw") {
    for (const p of s.players) drawToHandSize(p, 3);
    for (const p of s.players) p.actedThisRound = false;
    s.phase = "action";
  }

  if (s.phase === "action") {
    if (!allActed(s)) return;

    bossAct(s);

    if (s.round >= 9) {
      s.phase = "scoring";
      s.finished = true;
      return;
    }

    s.round += 1;
    s.phase = "forecast";
  }
}

export function setReady(s: GameState, userId: string) {
  const p = s.players.find((x) => x.userId === userId);
  if (!p) return;
  p.ready = true;
  ensurePhaseProgress(s);
}

export function playCard(s: GameState, userId: string, cardCode: string) {
  if (s.finished) return;
  if (s.phase !== "action") return;

  const p = s.players.find((x) => x.userId === userId);
  if (!p) return;
  if (p.actedThisRound) return;

  const idx = p.hand.indexOf(cardCode);
  if (idx < 0) return;

  const def = cardByCode(cardCode);

  if (p.mp < def.mpCost) return;

  p.mp -= def.mpCost;
  p.mp += def.gainMp;
  p.cp += def.gainCp;

  if (def.damage > 0) {
    s.boss.hp = Math.max(0, s.boss.hp - def.damage);
    p.vp += def.damage;
  }

  p.hand.splice(idx, 1);
  p.discard.push(cardCode);
  p.actedThisRound = true;

  ensurePhaseProgress(s);
}

export function endTurn(s: GameState, userId: string) {
  if (s.finished) return;
  if (s.phase !== "action") return;

  const p = s.players.find((x) => x.userId === userId);
  if (!p) return;

  p.actedThisRound = true;
  ensurePhaseProgress(s);
}

export function advancePhaseDebug(s: GameState) {
  if (s.finished) return;

  if (s.phase === "forecast") s.phase = "draw";
  else if (s.phase === "draw") s.phase = "action";
  else if (s.phase === "action") s.phase = "forecast";

  ensurePhaseProgress(s);
}

export function toClientState(s: GameState) {
  const finalScores = s.finished && s.phase === "scoring" ? scoring(s) : undefined;

  return {
    roomId: s.roomId,
    mode: s.mode,
    round: s.round,
    phase: s.phase,
    boss: { hp: s.boss.hp, maxHp: s.boss.maxHp, voltage: s.boss.voltage, foresight: s.boss.foresight },
    players: s.players.map((p) => ({
      userId: p.userId,
      nickname: p.nickname,
      vp: p.vp,
      injury: p.injury,
      mp: p.mp,
      cp: p.cp,
      actedThisRound: p.actedThisRound,
      deckCount: p.deck.length,
      discardCount: p.discard.length,
      hand: p.hand.map((code) => {
        const d = cardByCode(code);
        return {
          code: d.code,
          name: d.name,
          mpCost: d.mpCost,
          damage: d.damage,
          gainMp: d.gainMp,
          gainCp: d.gainCp
        };
      })
    })),
    finished: s.finished,
    finalScores
  };
}
