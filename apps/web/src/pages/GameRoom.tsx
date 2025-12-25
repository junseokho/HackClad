// apps/web/src/pages/GameRoom.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GameWS } from "../api/ws";

type GameState = {
  roomId?: string;
  mode: "pvp";
  round: number;
  phase: "foresight" | "draw" | "action" | "scoring";
  voltage?: number;
  boss: {
    name?: string;
    hp: number;
    foresight: string[];
  };
  players: Array<{
    userId: string;
    nickname: string;
    vp: number;
    injury: number;
    mp: number;
    cp: number;
    hand: string[];
    deck: string[];
    discard: string[];
    actedThisRound: boolean;
    ready?: boolean;
  }>;
  finished?: boolean;
  finalScores?: Array<{ userId: string; nickname: string; finalVp: number }>;
};

export default function GameRoom() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const ws = useMemo(() => new GameWS(), []);
  const [state, setState] = useState<GameState | null>(null);
  const [meId, setMeId] = useState<string>("");
  const [log, setLog] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      nav("/login");
      return;
    }
    if (!roomId) {
      nav("/lobby");
      return;
    }

    ws.connect(token, (msg: any) => {
      if (msg.type === "auth:ok") {
        setMeId(msg.user.id);
        setLog(`auth ok: ${msg.user.nickname}`);
        ws.send({ type: "game:subscribe", roomId });
        ws.send({ type: "pvp:ready", roomId });
        return;
      }

      if (msg.type === "game:state") {
        setState(msg.state);
        return;
      }

      if (msg.type === "error") {
        setLog(`error: ${msg.error}`);
        return;
      }

      if (msg.type === "ws:closed") {
        setLog("ws closed");
      }
    });

    return () => {
      // 개발 중에는 close를 호출하지 않음 (StrictMode/리렌더로 연결 끊김 방지)
      // ws.close();
    };
  }, [nav, roomId, ws]);

  const me = state?.players.find((p) => p.userId === meId);

  function playCard(code: string) {
    if (!roomId) return;
    ws.send({ type: "pvp:playCard", roomId, cardCode: code });
  }

  function endTurn() {
    if (!roomId) return;
    ws.send({ type: "pvp:endTurn", roomId });
  }

  function advancePhase() {
    if (!roomId) return;
    ws.send({ type: "pvp:advancePhase", roomId });
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/70">게임 상태 수신 대기중... {log}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[1200px] px-3 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-white/60">Room</div>
            <div className="text-sm font-semibold">{state.roomId ?? roomId}</div>
          </div>
          <button
            className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
            onClick={() => nav("/lobby")}
          >
            로비로
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-white/12 bg-white/5 p-4">
            <div className="text-xs text-white/60">진행</div>
            <div className="mt-1 text-lg font-black">
              Round {state.round} / {state.phase}
            </div>

            <div className="mt-4 rounded-2xl border border-white/12 bg-white/5 p-3">
              <div className="text-sm font-semibold">{state.boss.name ?? "Clad"}</div>
              <div className="mt-1 text-xs text-white/70">
                HP {state.boss.hp}
                {typeof state.voltage === "number" ? ` · Voltage ${state.voltage}` : ""}
              </div>

              <div className="mt-2 text-xs text-white/60">Foresight</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {state.boss.foresight.map((x, i) => (
                  <span
                    key={`${x}-${i}`}
                    className="rounded-xl border border-white/12 bg-white/5 px-2 py-1 text-[11px]"
                  >
                    {x}
                  </span>
                ))}
                {state.boss.foresight.length === 0 && <span className="text-[11px] text-white/50">-</span>}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold">Players</div>
              <div className="mt-2 grid gap-2">
                {state.players.map((p) => (
                  <div key={p.userId} className="rounded-2xl border border-white/12 bg-white/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">
                          {p.nickname} {p.userId === meId ? "(me)" : ""}
                        </div>
                        <div className="mt-1 text-xs text-white/60">
                          VP {p.vp} · Injury {p.injury} · MP {p.mp} · CP {p.cp}
                        </div>
                      </div>
                      <div className="text-xs text-white/60 text-right">
                        Hand {p.hand.length} · Deck {p.deck.length} · Discard {p.discard.length}
                        <div>{p.actedThisRound ? "acted" : "waiting"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                  onClick={endTurn}
                >
                  턴 종료
                </button>
                <button
                  className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                  onClick={advancePhase}
                >
                  다음 단계(디버그)
                </button>
              </div>

              <div className="mt-2 text-[11px] text-white/50">log: {log}</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/12 bg-white/5 p-4">
            <div className="text-xs text-white/60">내 손패</div>
            <div className="mt-1 text-lg font-black">Cards</div>

            {!me && <div className="mt-4 text-white/60">내 정보를 찾을 수 없음</div>}

            {me && (
              <div className="mt-4 grid gap-2">
                {me.hand.map((code) => (
                  <button
                    key={code}
                    className="rounded-2xl border border-white/12 bg-white/5 p-3 text-left hover:bg-white/10 disabled:opacity-40"
                    onClick={() => playCard(code)}
                    disabled={state.phase !== "action" || me.actedThisRound}
                    title={code}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{code}</div>
                        <div className="mt-1 text-xs text-white/60">카드 상세는 MVP 이후 연결</div>
                      </div>
                      <div className="text-xs text-white/60 text-right">play</div>
                    </div>
                  </button>
                ))}
                {me.hand.length === 0 && <div className="text-white/60">손패 없음</div>}
              </div>
            )}

            {state.phase === "scoring" && state.finalScores && (
              <div className="mt-4 rounded-2xl border border-white/12 bg-white/5 p-3">
                <div className="text-sm font-semibold">Final Score</div>
                <div className="mt-2 grid gap-1 text-xs text-white/70">
                  {state.finalScores.map((s) => (
                    <div key={s.userId}>
                      {s.nickname}: {s.finalVp}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
