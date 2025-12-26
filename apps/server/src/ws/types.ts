export type ClientToServer =
  | { type: "ping" }
  | { type: "auth"; token: string }
  | { type: "match:join"; mode: "coop" | "pvp"; size: 2 | 3 | 4 }
  | { type: "match:leave" }
  | { type: "game:subscribe"; roomId: string }
  | { type: "pvp:ready"; roomId: string }
  | { type: "pvp:chooseSlot"; roomId: string; slot: 1 | 2 | 3 | 4 }
  | { type: "pvp:playCard"; roomId: string; cardCode: string }
  | { type: "pvp:endTurn"; roomId: string }
  | { type: "pvp:advancePhase"; roomId: string };




export type ServerToClient =
  | { type: "auth:ok"; user: { id: string; username: string; nickname: string } }
  | { type: "auth:error"; error: string }
  | { type: "match:status"; status: "idle" | "searching"; current?: number; needed?: number; mode?: string }
  | { type: "match:found"; roomId: string; mode: "coop" | "pvp"; size: 2 | 3 | 4; players: Array<{ id: string; nickname: string }> }
  | { type: "game:start"; roomId: string }
  | { type: "game:state"; roomId: string; state: any }
  | { type: "error"; error: string }
  | { type: "pong" };

