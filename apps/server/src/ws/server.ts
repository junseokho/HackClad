// apps/server/src/ws/server.ts
import { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type WebSocket from "ws";

import type { ClientToServer } from "./types.js";
import {
  clients,
  send,
  sendError,
  getRoomClients,
  cleanupClient,
} from "./state.js";

import { verifyToken } from "../http/auth.js";
import { joinMatchmaking, leaveMatchmaking } from "./matchmaking.js";

// ✅ game handlers
import {
  handleGameSubscribe,
  handlePvpReady,
  handlePvpPlayCard,
  handlePvpEndTurn,
  handleAdvancePhaseDebug,
} from "./game.js";

export function attachWebSocketServer(httpServer: any) {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    console.log("[WS] connection");
    ws.on("close", (code, reason) => {
      console.log("[WS] close", code, reason?.toString?.());
    });
    ws.on("error", (e) => console.log("[WS] error", e));
    ws.on("message", (raw) => {
      let msg: ClientToServer | null = null;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        sendError(ws, "Invalid JSON");
        return;
      }

      if (!msg) return;

      // ping/pong
      if (msg.type === "ping") {
        send(ws, { type: "pong" });
        return;
      }

      // auth
      if (msg.type === "auth") {
        const payload = verifyToken(msg.token);
        if (!payload) {
          send(ws, { type: "auth:error", error: "Invalid token" });
          return;
        }

        clients.set(ws, {
          ws,
          user: {
            id: payload.userId,
            username: payload.username,
            nickname: payload.nickname,
          },
        });

        send(ws, {
          type: "auth:ok",
          user: {
            id: payload.userId,
            username: payload.username,
            nickname: payload.nickname,
          },
        });
        send(ws, { type: "match:status", status: "idle" });
        return;
      }

      // must be authed beyond this point
      const client = clients.get(ws);
      if (!client) {
        send(ws, { type: "auth:error", error: "Not authenticated" });
        return;
      }

      // ------------------------
      // matchmaking
      // ------------------------
      if (msg.type === "match:join") {
        joinMatchmaking(client, msg.mode, msg.size);
        return;
      }

      if (msg.type === "match:leave") {
        leaveMatchmaking(client);
        return;
      }

      // ------------------------
      // game (pvp mvp)
      // ------------------------
      if (msg.type === "game:subscribe") {
        const roomId = msg.roomId;
        if (!roomId) {
          sendError(ws, "Missing roomId");
          return;
        }
        handleGameSubscribe(client, roomId, getRoomClients(roomId));
        return;
      }

      if (msg.type === "pvp:ready") {
        handlePvpReady(client, msg.roomId, getRoomClients(msg.roomId));
        return;
      }

      if (msg.type === "pvp:playCard") {
        handlePvpPlayCard(
          client,
          msg.roomId,
          msg.cardCode,
          getRoomClients(msg.roomId)
        );
        return;
      }

      if (msg.type === "pvp:endTurn") {
        handlePvpEndTurn(client, msg.roomId, getRoomClients(msg.roomId));
        return;
      }

      if (msg.type === "pvp:advancePhase") {
        handleAdvancePhaseDebug(msg.roomId, getRoomClients(msg.roomId));
        return;
      }

      sendError(ws, "Unknown message type");
    });

    ws.on("close", () => {
      const client = clients.get(ws);
      if (client) {
        leaveMatchmaking(client);
      }
      cleanupClient(ws);
    });
  });

  return wss;
}
