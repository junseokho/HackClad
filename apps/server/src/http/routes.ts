import type { Express } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { signToken } from "./auth.js";
import { requireAuth, type AuthedRequest } from "./middleware.js";

function assert(condition: any, msg: string) {
  if (!condition) throw new Error(msg);
}

export function registerRoutes(app: Express) {
  app.get("/health", (_, res) => res.json({ ok: true }));

  app.post("/api/auth/signup", async (req, res) => {
    const { username, password, nickname, inviteCode } = req.body ?? {};

    if (!username || !password || !nickname) {
      return res.status(400).json({ error: "username/password/nickname required" });
    }
    if (inviteCode !== env.SIGNUP_INVITE_CODE) {
      return res.status(403).json({ error: "Invalid invite code" });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.status(409).json({ error: "Username already exists" });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: { username, passwordHash, nickname }
    });

    const token = signToken({ userId: user.id, username: user.username, nickname: user.nickname });

    res.json({
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname, selectedCharacterId: user.selectedCharacterId }
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) return res.status(400).json({ error: "username/password required" });

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ userId: user.id, username: user.username, nickname: user.nickname });

    res.json({
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname, selectedCharacterId: user.selectedCharacterId }
    });
  });

  app.get("/api/me", requireAuth, async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      include: { selectedCharacter: true }
    });
    if (!user) return res.status(404).json({ error: "Not found" });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        selectedCharacterId: user.selectedCharacterId,
        selectedCharacter: user.selectedCharacter
          ? {
              id: user.selectedCharacter.id,
              code: user.selectedCharacter.code,
              name: user.selectedCharacter.name,
              description: user.selectedCharacter.description,
              imageUrl: user.selectedCharacter.imageUrl
            }
          : null
      }
    });
  });

  // Characters list
  app.get("/api/characters", requireAuth, async (req: AuthedRequest, res) => {
    const chars = await prisma.character.findMany({
      where: { code: { notIn: ["CH_WITCH_A", "CH_WITCH_B"] } },
      orderBy: { createdAt: "asc" }
    });
    res.json({
      characters: chars.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl
      }))
    });
  });

  // Select character
  app.post("/api/characters/select", requireAuth, async (req: AuthedRequest, res) => {
    const { characterId } = req.body ?? {};
    if (!characterId) return res.status(400).json({ error: "characterId required" });

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return res.status(404).json({ error: "Character not found" });

    const user = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { selectedCharacterId: characterId }
    });

    res.json({ ok: true, selectedCharacterId: user.selectedCharacterId });
  });

  // Card pool for a character
  app.get("/api/cards", requireAuth, async (req: AuthedRequest, res) => {
    const characterId = String(req.query.characterId ?? "");
    if (!characterId) return res.status(400).json({ error: "characterId required" });

    const pool = await prisma.characterCard.findMany({
      where: { characterId },
      include: { card: true },
      orderBy: [{ isStarter: "desc" }, { id: "asc" }]
    });

    res.json({
      cards: pool.map((p) => ({
        id: p.card.id,
        code: p.card.code,
        name: p.card.name,
        description: p.card.description,
        costMP: p.card.costMP,
        tags: p.card.tags,
        isStarter: p.isStarter
      }))
    });
  });

  // Get active deck for user+character (create default if missing)
  app.get("/api/decks", requireAuth, async (req: AuthedRequest, res) => {
    const characterId = String(req.query.characterId ?? "");
    if (!characterId) return res.status(400).json({ error: "characterId required" });

    const userId = req.auth!.userId;

    let deck = await prisma.deck.findFirst({
      where: { userId, characterId, isActive: true },
      include: { cards: { include: { card: true } } },
      orderBy: { updatedAt: "desc" }
    });

    if (!deck) {
      // default: 9 cards from starter pool (fill with starters, then others)
      const pool = await prisma.characterCard.findMany({
        where: { characterId },
        include: { card: true },
        orderBy: [{ isStarter: "desc" }, { id: "asc" }]
      });

      // default: 8 starters + 1 enhanced if available
      const starters = pool.filter((p) => p.isStarter).slice(0, 8);
      const enhancedPick = pool.filter((p) => !p.isStarter)[0] ?? pool.slice(8, 9)[0];
      const picked: Array<{ cardId: string; count: number }> = [];
      for (const p of starters) picked.push({ cardId: p.cardId, count: 1 });
      if (enhancedPick) picked.push({ cardId: enhancedPick.cardId, count: 1 });

      deck = await prisma.deck.create({
        data: {
          userId,
          characterId,
          name: "기본 덱",
          isActive: true,
          cards: {
            create: picked.map((x) => ({ cardId: x.cardId, count: x.count }))
          }
        },
        include: { cards: { include: { card: true } } }
      });
    }

    res.json({
      deck: {
        id: deck.id,
        name: deck.name,
        isActive: deck.isActive,
        cards: deck.cards.map((dc) => ({
          cardId: dc.cardId,
          code: dc.card.code,
          name: dc.card.name,
          description: dc.card.description,
          costMP: dc.card.costMP,
          count: dc.count
        }))
      }
    });
  });

  // Save deck (enforce 9 cards total)
  app.post("/api/decks/save", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const { characterId, name, cards } = req.body ?? {};
      assert(characterId, "characterId required");
      assert(Array.isArray(cards), "cards must be array");

      const total = cards.reduce((acc: number, c: any) => acc + Number(c.count ?? 0), 0);
      if (total !== 9) return res.status(400).json({ error: "Deck must be exactly 9 cards" });

      // Validate pool ownership
      const pool = await prisma.characterCard.findMany({ where: { characterId } });
      const poolSet = new Set(pool.map((p) => p.cardId));
      for (const c of cards) {
        if (!poolSet.has(String(c.cardId))) {
          return res.status(400).json({ error: "Deck contains invalid card for character" });
        }
      }

      const userId = req.auth!.userId;

      // Upsert active deck for user+character
      let deck = await prisma.deck.findFirst({
        where: { userId, characterId, isActive: true },
        orderBy: { updatedAt: "desc" }
      });

      if (!deck) {
        deck = await prisma.deck.create({
          data: { userId, characterId, name: name?.trim() || "내 덱", isActive: true }
        });
      } else {
        deck = await prisma.deck.update({
          where: { id: deck.id },
          data: { name: name?.trim() || deck.name }
        });
      }

      // Replace cards
      await prisma.deckCard.deleteMany({ where: { deckId: deck.id } });
      await prisma.deckCard.createMany({
        data: cards
          .filter((c: any) => Number(c.count ?? 0) > 0)
          .map((c: any) => ({
            deckId: deck!.id,
            cardId: String(c.cardId),
            count: Number(c.count)
          }))
      });

      const saved = await prisma.deck.findUnique({
        where: { id: deck.id },
        include: { cards: { include: { card: true } } }
      });

      res.json({
        ok: true,
        deck: {
          id: saved!.id,
          name: saved!.name,
          cards: saved!.cards.map((dc) => ({
            cardId: dc.cardId,
            code: dc.card.code,
            name: dc.card.name,
            count: dc.count
          }))
        }
      });
    } catch (e: any) {
      res.status(400).json({ error: e?.message ?? "Bad request" });
    }
  });
}
