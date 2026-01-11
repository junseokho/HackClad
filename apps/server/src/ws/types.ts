export type ClientToServer =
  | { type: "ping" }
  | { type: "auth"; token: string }
  | { type: "match:join"; mode: "coop" | "pvp"; size: 2 | 3 | 4 }
  | { type: "match:leave" }
  | { type: "game:subscribe"; roomId: string }
  | { type: "pvp:ready"; roomId: string }
  | {
      type: "pvp:chooseSlot";
      roomId: string;
      slot: 1 | 2 | 3 | 4;
      turnCardCode: string;
      spawn?: { x: number; y: number };
      returnCardCode?: string | null;
      moveTarget?: { x: number; y: number } | null;
    }
  | { type: "pvp:pickEnhanced"; roomId: string; cardCode: string }
  | { type: "pvp:playCard"; roomId: string; cardCode: string; dir?: "N" | "E" | "S" | "W" }
  | { type: "pvp:basicAction"; roomId: string; action: "move" | "mp" | "dmgReduce"; dir?: "N" | "E" | "S" | "W"; discardCard?: string }
  | { type: "pvp:cpAction"; roomId: string; actionId: string; target?: { x: number; y: number }; dir?: "N" | "E" | "S" | "W" }
  | { type: "pvp:miaTrapAttack"; roomId: string; target: { kind: "boss" | "legion"; pos?: { x: number; y: number } } }
  | { type: "pvp:react"; roomId: string; kind: "playCard" | "basicAction" | "cpAction" | "crack" | "pass"; payload?: any }
  | { type: "pvp:crack"; roomId: string; dir?: "N" | "E" | "S" | "W"; steps?: number; moveTarget?: { x: number; y: number } | null }
  | { type: "pvp:enter"; roomId: string; pos: { x: number; y: number } }
  | { type: "game:choice"; roomId: string; choiceId: string; value: any }
  | { type: "pvp:endTurn"; roomId: string }
  | { type: "pvp:advancePhase"; roomId: string };




export type ServerToClient =
  | { type: "auth:ok"; user: { id: string; username: string; nickname: string } }
  | { type: "auth:error"; error: string }
  | { type: "match:status"; status: "idle" | "searching"; current?: number; needed?: number; mode?: string }
  | { type: "match:found"; roomId: string; mode: "coop" | "pvp"; size: 2 | 3 | 4; players: Array<{ id: string; nickname: string }> }
  | { type: "game:start"; roomId: string }
  | { type: "game:state"; roomId: string; state: any }
  | { type: "game:toast"; message: string }
  | { type: "game:choose"; choiceId: string; prompt: string; options?: any }
  | { type: "error"; error: string }
  | { type: "pong" };
