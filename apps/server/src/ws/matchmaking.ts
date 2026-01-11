import { randomUUID } from "node:crypto";
import type { AuthedClient } from "./state.js";
import { matchmakingQueues, makeMatchKey, rooms } from "./state.js";
import type { ServerToClient } from "./types.js";
import { prisma } from "../db/prisma.js";

function send(ws: any, msg: ServerToClient) {
  ws.send(JSON.stringify(msg));
}

function broadcast(clients: AuthedClient[], msg: ServerToClient) {
  for (const c of clients) send(c.ws, msg);
}

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

async function createPvpRoom(roomId: string, selected: AuthedClient[]) {
  // Load each player's selected character + active deck (9 cards total)
  const players = [];
  for (let idx = 0; idx < selected.length; idx++) {
    const c = selected[idx];
    const user = await prisma.user.findUnique({
      where: { id: c.user.id },
      include: { selectedCharacter: true }
    });
    const selectedCharacter = user?.selectedCharacter ?? null;

    if (!user?.selectedCharacterId) {
      // fallback: pick first character
      const first = await prisma.character.findFirst({ orderBy: { createdAt: "asc" } });
      if (first) {
        await prisma.user.update({ where: { id: c.user.id }, data: { selectedCharacterId: first.id } });
      }
    }

    const characterId = (user?.selectedCharacterId ?? (await prisma.user.findUnique({ where: { id: c.user.id } }))?.selectedCharacterId) as string;
    const character =
      selectedCharacter ??
      (characterId ? await prisma.character.findUnique({ where: { id: characterId } }) : null);

    const pool = await prisma.characterCard.findMany({
      where: { characterId },
      include: { card: true },
      orderBy: [{ isStarter: "desc" }, { id: "asc" }]
    });

    // Ensure we have a deck record (for persistence), but starter/enhanced options come from pool
    const deck = await prisma.deck.findFirst({
      where: { userId: c.user.id, characterId, isActive: true },
      include: { cards: { include: { card: true } } },
      orderBy: { updatedAt: "desc" }
    });

    if (!deck) {
      const starters = pool.filter((p) => p.isStarter).slice(0, 8);
      const enhancedPick = pool.filter((p) => !p.isStarter)[0] ?? pool.slice(8, 9)[0];
      const picked: Array<{ cardId: string; count: number }> = [];
      for (const p of starters) picked.push({ cardId: p.cardId, count: 1 });
      if (enhancedPick) picked.push({ cardId: enhancedPick.cardId, count: 1 });

      await prisma.deck.create({
        data: {
          userId: c.user.id,
          characterId,
          name: "기본 덱",
          isActive: true,
          cards: { create: picked }
        }
      });
    }

    // Build starter-only deck (8 starters) and enhanced options (non-starters) from pool
    const starters = pool.filter((p) => p.isStarter).slice(0, 8);
    const enhanced = pool.filter((p) => !p.isStarter);
    const starterCodes = starters.map((c) => c.card.code);
    const enhancedOptions = enhanced.map((c) => c.card.code);

    const ENTRY_POINTS: Array<{ x: number; y: number }> = [
      { x: -2, y: -1 }, // Entry A
      { x: 2, y: 1 }, // Entry B
      { x: -1, y: 2 }, // Entry C
      { x: 1, y: -2 } // Entry D
    ];
    const entry = ENTRY_POINTS[idx] ?? null;

    players.push({
      userId: c.user.id,
      nickname: c.user.nickname,
      characterId,
      characterCode: character?.code ?? null,
      characterImageUrl: character?.imageUrl ?? null,
      ready: false,
      actedThisRound: false,
      standbySlot: idx + 1, // Standby 1 is rightmost; initial order follows join order
      standbyCard: starterCodes.shift() ?? null, // draw top card to standby
      turnCard: null,
      vp: 0,
      vpShards: 0,
      injury: 0,
      mp: 0,
      cp: 0,
      reformUsedThisRound: false,
      basicUses: { move: 0, mp: 0, dmgReduce: 0 },
      position: entry,
      facing: "N",
      deck: shuffle(starterCodes),
      hand: [],
      discard: [],
      unyieldingActive: false,
      crackBonus: 0,
      crackUsedTurn: 0,
      crackAtkBonus: 0,
      crackUsedRound: 0,
      nextAttackMultistrike: 0,
      attacksPlayedThisTurn: 0,
      supportsPlayedThisTurn: 0,
      counterBattery: 0,
      conibearTraps: character?.code === "CH_MIA_DELTA" ? [false, false] : [],
      damageDealtTurn: 0,
      damageDealtRound: 0,
      miaShardBonusRound: false,
      miaStealthUsedRound: false,
      convergenceSealUsedTurn: false,
      turnCardAttachment: null,
      enhancedDeck: enhancedOptions.slice(),
      needsEnhancedPick: enhancedOptions.length > 0,
      enhancedOptions
    });
  }

  const CLAD_BOSS = {
    name: "Clad Hydra",
    hp: 40,
    position: { x: 0, y: 0 },
    facing: "N" as const
  };

  // Start with voltage 1 cards only; higher-voltage cards get injected later as the deck depletes.
  const BOSS_DECK = shuffle([
    "HacKClaD_Clad_Hydra_Backslam",
    "HacKClaD_Clad_Hydra_SavageFangs",
    "HacKClaD_Clad_Hydra_ScorchingBreath",
    "HacKClaD_Clad_Hydra_Skewer",
    "HacKClaD_Clad_Hydra_SpiralAmbushLeft",
    "HacKClaD_Clad_Hydra_SpiralAmbushRight"
  ]);

  const state = {
    mode: "pvp",
    roomId,
    finished: false,
    round: 1,
    phase: "forecast",
    voltage: 1,
    boss: {
      ...CLAD_BOSS,
      deck: BOSS_DECK,
      foresight: [],
      discard: [],
      voltage: 1,
      voltageTier: 1
    },
    legions: [],
    legionAttackDone: false,
    legionAttackReady: false,
    players,
    shardsOnBoard: {}
  };

  rooms.set(roomId, state);
  console.log("[ROOM] created", roomId, "rooms.size=", rooms.size);
  return state;
}

export function joinMatchmaking(client: AuthedClient, mode: "coop" | "pvp", size: 2 | 3 | 4) {
  leaveMatchmaking(client);

  const key = makeMatchKey(mode, size);
  const q = matchmakingQueues.get(key) ?? [];
  q.push(client);
  matchmakingQueues.set(key, q);

  client.matchKey = key;

  broadcast(q, { type: "match:status", status: "searching", current: q.length, needed: size, mode: key });

  if (q.length >= size) {
    const selected = q.splice(0, size);
    matchmakingQueues.set(key, q);

    const roomId = randomUUID();
    for (const s of selected) {
      s.roomId = roomId;
      s.matchKey = undefined;
    }

    const publicPlayers = selected.map((s) => ({ id: s.user.id, nickname: s.user.nickname }));

    console.log("[ROOM] start sent", roomId);
    broadcast(selected, { type: "match:found", roomId, mode, size, players: publicPlayers });
    broadcast(selected, { type: "game:start", roomId });

    // Create initial room state (pvp only for now)
    if (mode === "pvp") {
      createPvpRoom(roomId, selected)
        .then((state) => {
          broadcast(selected, { type: "game:state", roomId, state });
        })
        .catch((e) => {
          broadcast(selected, { type: "error", error: `Failed to init room: ${e?.message ?? "unknown"}` });
        });
    }

    broadcast(q, { type: "match:status", status: "searching", current: q.length, needed: size, mode: key });
  }
}

export function leaveMatchmaking(client: AuthedClient) {
  if (!client.matchKey) return;
  const key = client.matchKey;
  const q = matchmakingQueues.get(key);
  if (!q) {
    client.matchKey = undefined;
    return;
  }

  const idx = q.findIndex((c) => c.ws === client.ws);
  if (idx >= 0) q.splice(idx, 1);

  matchmakingQueues.set(key, q);
  client.matchKey = undefined;

  const needed = Number(key.split(":")[1]);

  broadcast(q, { type: "match:status", status: "searching", current: q.length, needed: needed as any, mode: key });
  send(client.ws, { type: "match:status", status: "idle" });
}
