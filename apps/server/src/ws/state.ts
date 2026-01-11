// apps/server/src/ws/state.ts
import type WebSocket from "ws";
import type { ServerToClient } from "./types.ts";

export type AuthedClient = {
  ws: WebSocket;
  user: { id: string; username: string; nickname: string };
  matchKey?: string;
  roomId?: string;
};

export type MatchKey = string;

export const clients = new Map<WebSocket, AuthedClient>();
export const matchmakingQueues = new Map<MatchKey, AuthedClient[]>();

export function makeMatchKey(mode: "coop" | "pvp", size: 2 | 3 | 4): MatchKey {
  return `${mode}:${size}`;
}

// 아직 game state 타입은 any로 (나중에 GameState로 교체)
export const rooms = new Map<string, any>();

// --------------------
// room/client helpers
// --------------------
export function getRoomClients(roomId: string): AuthedClient[] {
  return Array.from(clients.values()).filter((c) => c.roomId === roomId);
}

export function getClient(ws: WebSocket): AuthedClient | null {
  return clients.get(ws) ?? null;
}

export function requireClient(ws: WebSocket): AuthedClient {
  const c = clients.get(ws);
  if (!c) throw new Error("UNAUTHED");
  return c;
}

export function getRoom(roomId: string): any | null {
  return rooms.get(roomId) ?? null;
}

export function requireRoom(roomId: string): any {
  const r = rooms.get(roomId);
  if (!r) throw new Error("ROOM_NOT_FOUND");
  return r;
}

// --------------------
// ws send/broadcast (protocol-aligned: flat objects)
// --------------------
function isWsOpen(ws: WebSocket) {
  return (ws as any).readyState === 1;
}

export function send(ws: WebSocket, msg: ServerToClient) {
  if (!isWsOpen(ws)) return;
  ws.send(JSON.stringify(msg));
}

export function sendError(ws: WebSocket, error: string) {
  send(ws, { type: "error", error });
}

export function broadcast(roomClients: AuthedClient[], msg: ServerToClient) {
  for (const c of roomClients) send(c.ws, msg);
}

export function broadcastToRoom(roomId: string, msg: ServerToClient) {
  broadcast(getRoomClients(roomId), msg);
}

export function broadcastRoomState(roomId: string, state: any) {
  broadcastToRoom(roomId, { type: "game:state", roomId, state });
}

// Remove rooms that no longer have any connected clients.
export function pruneEmptyRooms(): number {
  let removed = 0;
  for (const [roomId] of rooms.entries()) {
    if (getRoomClients(roomId).length === 0) {
      rooms.delete(roomId);
      removed += 1;
    }
  }
  if (removed > 0) {
    console.log(`[ROOM] pruned ${removed} empty room(s)`);
  }
  return removed;
}

// --------------------
// cleanup
// --------------------
export function removeFromQueue(client: AuthedClient) {
  const key = client.matchKey;
  if (!key) return;
  const q = matchmakingQueues.get(key);
  if (!q) return;

  const idx = q.findIndex((c) => c.user.id === client.user.id);
  if (idx >= 0) q.splice(idx, 1);
  if (q.length === 0) matchmakingQueues.delete(key);

  delete client.matchKey;
}

export function cleanupClient(ws: WebSocket) {
  const c = clients.get(ws);
  if (!c) return;
  const roomId = c.roomId;
  removeFromQueue(c);
  clients.delete(ws);
  if (roomId) {
    pruneEmptyRooms();
  }
}
