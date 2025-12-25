import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GameWS } from "../api/ws";
import { Container } from "../components/Container";
import { Card } from "../components/Card";

type MatchStatus = {
  status: "idle" | "searching";
  current?: number;
  needed?: number;
  mode?: string;
};

type Found = {
  roomId: string;
  players: Array<{ id: string; nickname: string }>;
};

type GameState = {
  mode?: string;
  round?: number;
  phase?: string;
  voltage?: number;
  boss?: { name?: string; hp?: number; foresight?: string[] };
  players?: Array<{
    userId: string;
    nickname: string;
    vp: number;
    injury: number;
    mp: number;
    cp: number;
    hand: string[];
    deck: string[];
    discard: string[];
  }>;
};

function parseQuery(search: string) {
  const sp = new URLSearchParams(search);
  const mode = sp.get("mode") as "solo" | "coop" | "pvp" | null;
  const sizeStr = sp.get("size");
  const size = sizeStr ? (Number(sizeStr) as 2 | 3 | 4) : null;
  return { mode, size };
}

export default function Play() {
  const nav = useNavigate();
  const loc = useLocation();
  const ws = useMemo(() => new GameWS(), []);
  const [status, setStatus] = useState<MatchStatus>({ status: "idle" });
  const [found, setFound] = useState<Found | null>(null);
  const [startedRoomId, setStartedRoomId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [log, setLog] = useState<string>("");

  const autoJoinedRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      nav("/login");
      return;
    }

    ws.connect(token, (msg: any) => {
      if (msg.type === "auth:ok") setLog(`WS auth ok: ${msg.user.nickname}`);
      if (msg.type === "match:status") setStatus(msg);
      if (msg.type === "match:found") setFound({ roomId: msg.roomId, players: msg.players });
      if (msg.type === "game:start") {
        setStartedRoomId(msg.roomId);
        nav(`/game/${msg.roomId}`);
      }


      // 방법 B: game:state를 state로 저장 + 화면 표시
      if (msg.type === "game:state") {
        setGameState(msg.state);
        setLog(`game state received: round=${msg.state?.round}, phase=${msg.state?.phase}`);
      }

      if (msg.type === "error" || msg.type === "auth:error") setLog(`${msg.type}: ${msg.error}`);
      if (msg.type === "ws:closed") setLog("WS closed");
    });

    return () => {};
  }, [nav, ws]);

  // 로비에서 넘어온 mode/size를 읽고 자동 매칭 시작
  useEffect(() => {
    const { mode, size } = parseQuery(loc.search);
    if (autoJoinedRef.current) return;
    if (!mode) return;

    // 새 진입 시 초기화
    setFound(null);
    setStartedRoomId(null);
    setGameState(null);

    if (mode === "solo") {
      setLog("솔로 모드는 다음 단계에서 게임 로직 붙이면서 구현");
      autoJoinedRef.current = true;
      return;
    }

    if ((mode === "coop" || mode === "pvp") && (size === 2 || size === 3 || size === 4)) {
      autoJoinedRef.current = true;
      ws.send({ type: "match:join", mode, size });
    }
  }, [loc.search, ws]);

  function cancelMatch() {
    ws.send({ type: "match:leave" });
    setFound(null);
    setStartedRoomId(null);
    setGameState(null);
    setStatus({ status: "idle" });
    autoJoinedRef.current = false; // 로비로 돌아가서 다시 시작 가능하게
    nav("/lobby");
  }

  return (
    <Container>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-text-dim">매칭</div>
          <div className="text-lg font-semibold">게임 시작 준비</div>
        </div>
        <button
          className="rounded-xl border border-line bg-bg1/40 px-3 py-2 text-xs hover:bg-bg1/70"
          onClick={() => nav("/lobby")}
        >
          로비로
        </button>
      </div>

      <Card>
        {status.status === "searching" ? (
          <div className="grid gap-3">
            <div className="text-text-sub">매칭 중...</div>
            <div className="text-2xl font-black">
              {status.current ?? 0}/{status.needed ?? 0}
            </div>
            <div className="text-xs text-text-dim">{status.mode}</div>

            <button
              className="mt-2 rounded-xl border border-line bg-bg1/40 px-3 py-3 font-semibold hover:bg-bg1/70"
              onClick={cancelMatch}
            >
              매칭 취소
            </button>
          </div>
        ) : (
          <div className="text-text-sub">로비에서 모드/인원을 선택하면 자동으로 매칭이 시작돼.</div>
        )}

        {found && (
          <div className="mt-4 rounded-xl border border-line bg-bg1/30 p-3">
            <div className="text-sm font-semibold">매칭 성공</div>
            <div className="text-xs text-text-dim">Room: {found.roomId}</div>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {found.players.map((p) => (
                <li key={p.id}>{p.nickname}</li>
              ))}
            </ul>
          </div>
        )}

        {startedRoomId && (
          <div className="mt-4 rounded-xl border border-line bg-bg1/30 p-3">
            <div className="text-sm font-semibold">게임 시작 신호 수신</div>
            <div className="text-xs text-text-dim">{startedRoomId}</div>
            <div className="mt-2 text-xs text-text-dim">
              다음 단계에서 roomId로 실제 게임 화면(/game/:roomId)로 이동시키면 됨
            </div>
          </div>
        )}

        {gameState && (
          <div className="mt-4 rounded-xl border border-line bg-bg1/30 p-3">
            <div className="text-sm font-semibold">초기 게임 상태</div>

            <div className="mt-2 grid gap-1 text-xs text-text-dim">
              <div>
                mode: <span className="text-text-main">{gameState.mode ?? "-"}</span>
              </div>
              <div>
                round: <span className="text-text-main">{gameState.round ?? "-"}</span>
              </div>
              <div>
                phase: <span className="text-text-main">{gameState.phase ?? "-"}</span>
              </div>
              <div>
                voltage: <span className="text-text-main">{gameState.voltage ?? "-"}</span>
              </div>
              <div>
                boss:{" "}
                <span className="text-text-main">
                  {gameState.boss?.name ?? "-"} (hp {gameState.boss?.hp ?? "-"})
                </span>
              </div>
              <div>
                boss foresight:{" "}
                <span className="text-text-main">
                  {Array.isArray(gameState.boss?.foresight) ? gameState.boss!.foresight!.join(", ") : "-"}
                </span>
              </div>
            </div>

            {Array.isArray(gameState.players) && (
              <div className="mt-3 grid gap-2">
                <div className="text-xs font-semibold text-text-sub">Players</div>
                {gameState.players.map((p) => (
                  <div key={p.userId} className="rounded-xl border border-line bg-bg1/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{p.nickname}</div>
                        <div className="mt-1 text-xs text-text-dim">
                          VP {p.vp} · Injury {p.injury} · MP {p.mp} · CP {p.cp}
                        </div>
                      </div>
                      <div className="text-xs text-text-dim text-right">
                        Hand {p.hand?.length ?? 0} · Deck {p.deck?.length ?? 0} · Discard{" "}
                        {p.discard?.length ?? 0}
                      </div>
                    </div>

                    {Array.isArray(p.hand) && p.hand.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {p.hand.map((code, idx) => (
                          <span
                            key={`${code}-${idx}`}
                            className="rounded-lg border border-line bg-bg1/50 px-2 py-1 text-[11px] text-text-main"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 text-xs text-text-dim">log: {log}</div>
      </Card>
    </Container>
  );
}
