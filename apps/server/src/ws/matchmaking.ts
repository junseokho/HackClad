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
  for (const c of selected) {
    const user = await prisma.user.findUnique({
      where: { id: c.user.id },
      include: { selectedCharacter: true }
    });

    if (!user?.selectedCharacterId) {
      // fallback: pick first character
      const first = await prisma.character.findFirst({ orderBy: { createdAt: "asc" } });
      if (first) {
        await prisma.user.update({ where: { id: c.user.id }, data: { selectedCharacterId: first.id } });
      }
    }

    const characterId = (user?.selectedCharacterId ?? (await prisma.user.findUnique({ where: { id: c.user.id } }))?.selectedCharacterId) as string;

    const deck = await prisma.deck.findFirst({
      where: { userId: c.user.id, characterId, isActive: true },
      include: { cards: { include: { card: true } } },
      orderBy: { updatedAt: "desc" }
    });

    // If no active deck exists for this character, create a default 9-card deck from its pool
    let ensuredDeck = deck;
    if (!ensuredDeck) {
      const pool = await prisma.characterCard.findMany({
        where: { characterId },
        include: { card: true },
        orderBy: [{ isStarter: "desc" }, { id: "asc" }]
      });

      const picked: Array<{ cardId: string; count: number }> = [];
      let total = 0;
      for (const p of pool) {
        if (total >= 9) break;
        picked.push({ cardId: p.cardId, count: 1 });
        total += 1;
      }

      ensuredDeck = await prisma.deck.create({
        data: {
          userId: c.user.id,
          characterId,
          name: "기본 덱",
          isActive: true,
          cards: { create: picked }
        },
        include: { cards: { include: { card: true } } }
      });
    }

    // Expand deck to card codes list
    const expanded: string[] = [];
    if (ensuredDeck) {
      for (const dc of ensuredDeck.cards) {
        for (let i = 0; i < dc.count; i++) expanded.push(dc.card.code);
      }
    }

    // Ensure 9 cards (fallback: fill with basic strike if needed)
    while (expanded.length < 9) expanded.push("C_BASIC_STRIKE");

    const deckShuffled = shuffle(expanded);
    const hand = deckShuffled.slice(0, 3);
    const rest = deckShuffled.slice(3);

    players.push({
      userId: c.user.id,
      nickname: c.user.nickname,
      characterId,
      ready: false,
      actedThisRound: false,
      vp: 0,
      injury: 0,
      mp: 0,
      cp: 0,
      deck: rest,
      hand,
      discard: []
    });
  }

  const CLAD_BOSS = {
    name: "Clad Hydra",
    hp: 40,
    position: { x: 0, y: 0 },
    facing: "N" as const
  };

  const BOSS_DECK = shuffle([
    "HacKClaD_Clad_Hydra_Backslam",
    "HacKClaD_Clad_Hydra_CrashingFootfallsLeft",
    "HacKClaD_Clad_Hydra_CrashingFootfallsRight",
    "HacKClaD_Clad_Hydra_HomecomingInstinct",
    "HacKClaD_Clad_Hydra_IncineratingFlames",
    "HacKClaD_Clad_Hydra_SavageFangs",
    "HacKClaD_Clad_Hydra_ScorchingBreath",
    "HacKClaD_Clad_Hydra_Skewer",
    "HacKClaD_Clad_Hydra_SpiralAmbushLeft",
    "HacKClaD_Clad_Hydra_SpiralAmbushRight",
    "HacKClaD_Clad_Hydra_SweepingStrike",
    "HacKClaD_Clad_Hydra_TerrainCrush"
  ]);

  const state = {
    mode: "pvp",
    finished: false,
    round: 1,
    phase: "forecast",
    voltage: 0,
    boss: {
      ...CLAD_BOSS,
      deck: BOSS_DECK,
      foresight: [],
      discard: [],
      voltage: 0
    },
    players
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
