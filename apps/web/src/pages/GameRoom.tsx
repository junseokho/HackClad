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
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showDeckPreview, setShowDeckPreview] = useState(false);
  const [showDiscardPreview, setShowDiscardPreview] = useState(false);
  const [showDeckDetail, setShowDeckDetail] = useState(false);
  const [showDiscardDetail, setShowDiscardDetail] = useState(false);

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
      // 개발 환경에서 StrictMode로 두 번 호출되는 것을 막기 위해 close는 생략
      // ws.close();
    };
  }, [nav, roomId, ws]);

  const me = state?.players.find((p) => p.userId === meId);
  const canAct = state?.phase === "action" && !state?.finished;
  const myTurn = canAct && !me?.actedThisRound;
  const bossActionCards = state?.boss.foresight.length
    ? state.boss.foresight
    : ["행동 1", "행동 2", "행동 3"];

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

  function requestCardBurn(label: string) {
    setLog((prev) => `${label} 사용: 버릴 카드 선택 UI 필요\n${prev ?? ""}`);
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-slate-400">게임 상태 불러오는 중... {log}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,184,107,0.15),_transparent_40%),radial-gradient(circle_at_center,_rgba(255,255,255,0.05),_transparent_55%)]" />
      <div className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-6 relative">
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] tracking-wide uppercase text-slate-400">Room</div>
            <div className="text-sm font-semibold">{state.roomId ?? roomId}</div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <span className="rounded-full border border-white/10 bg-slate-800/70 px-2 py-1">Round {state.round}</span>
            <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2 py-1 uppercase">
              {state.phase}
            </span>
            <button
              className="ml-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-xs hover:bg-white/20"
              onClick={() => nav("/lobby")}
            >
              로비
            </button>
          </div>
        </header>

        <div className="mt-4 grid gap-3 xl:grid-cols-[280px_1fr_340px]">
          {/* 좌측: 캐릭터 상태 패널 */}
          <button className="hidden" onClick={advancePhase} aria-label="advance phase debug" />
          <aside className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/80 p-4 space-y-3 shadow-lg">
            <div className="text-sm font-semibold tracking-tight">파티</div>
            {state.players.map((p) => (
              <div
                key={p.userId}
                className="rounded-2xl border border-white/10 bg-slate-950/80 p-3 flex items-start gap-3 shadow-inner"
              >
                <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-amber-500/40 to-rose-500/40 border border-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold truncate">
                      {p.nickname} {p.userId === meId ? "(me)" : ""}
                    </div>
                    <div className="text-[11px] text-slate-400">{p.actedThisRound ? "대기" : "행동 가능"}</div>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-slate-200">
                    <StatBar label="MP" value={p.mp} max={15} color="from-sky-400 to-cyan-300" />
                    <StatBar label="CP" value={p.cp} max={10} color="from-blue-400 to-indigo-300" />
                    <StatBar label="VP" value={p.vp} max={30} color="from-amber-400 to-orange-300" />
                    <div className="text-[10px] text-rose-300">부상 {p.injury}</div>
                  </div>
                </div>
              </div>
            ))}
          </aside>

          {/* 중앙: 보드 + 핸드 */}
          <main className="flex flex-col gap-4 relative">
            <div className="relative rounded-3xl border border-white/10 bg-slate-950/60 shadow-[0_0_30px_rgba(255,184,107,0.15)] overflow-hidden">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_rgba(255,184,107,0.35),_transparent_35%)]" />
              <div className="flex items-center justify-between px-4 pt-3 text-xs text-slate-200 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px]">전장</span>
                  <span>Boss {state.boss.name ?? "Clad"}</span>
                  <span>
                    HP {state.boss.hp}
                    {typeof state.voltage === "number" ? ` · Voltage ${state.voltage}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  {state.boss.foresight.slice(0, 3).map((f, i) => (
                    <span
                      key={i}
                      className="rounded border border-rose-300/40 bg-rose-500/20 px-2 py-1 text-rose-100"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative z-10 p-4 pb-6">
                <div className="grid grid-cols-5 gap-[6px]">
                  {Array.from({ length: 25 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-[10px] border border-white/10 bg-slate-900/70 shadow-inner"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-300">손패</div>
                <div className="text-[11px] text-slate-400">{myTurn ? "행동 가능" : "대기 중"}</div>
              </div>
              {!me && <div className="mt-2 text-slate-400">내 정보를 찾는 중...</div>}
              {me && (
                <div className="mt-3 flex flex-wrap gap-2 justify-center">
                  {me.hand.map((code, idx) => (
                    <button
                      key={code + idx}
                      className="group relative rounded-xl border border-amber-300/30 bg-gradient-to-br from-slate-900 to-slate-950 px-3 py-3 text-left text-sm shadow-[0_8px_20px_rgba(0,0,0,0.45)] hover:border-amber-300/60 hover:shadow-[0_10px_30px_rgba(255,184,107,0.25)] disabled:opacity-40"
                      onClick={() => playCard(code)}
                      disabled={!myTurn}
                      onMouseEnter={() => setHoveredCard(code)}
                      onMouseLeave={() => setHoveredCard((prev) => (prev === code ? null : prev))}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{code}</div>
                          <div className="text-[11px] text-slate-400">커서 시 확대</div>
                        </div>
                        <div className="text-[11px] text-amber-200">PLAY</div>
                      </div>
                      <div className="mt-2 hidden group-hover:block text-xs text-slate-100">
                        확대된 카드 이미지/설명
                      </div>
                    </button>
                  ))}
                  {me.hand.length === 0 && <div className="text-slate-400">카드 없음</div>}
                </div>
              )}
              {hoveredCard && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-sm shadow-inner">
                  <div className="font-semibold text-amber-200">{hoveredCard}</div>
                  <div className="mt-1 text-xs text-slate-300">확대된 카드 설명 자리</div>
                </div>
              )}
            </div>
          </main>

          {/* 우측: 진행 순서 + 액션 + 로그 */}
          <aside className="space-y-3">
            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow-lg">
              <div className="text-sm font-semibold">진행 순서</div>
              <div className="mt-3 flex items-center gap-2 overflow-x-auto">
                {bossActionCards.map((card, idx) => (
                  <div
                    key={`boss-${idx}`}
                    className="min-w-[120px] rounded-2xl border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-50"
                  >
                    Clad {card}
                  </div>
                ))}
                {state.players.map((p) => (
                  <div
                    key={`order-${p.userId}`}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400/50 to-sky-400/50" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.nickname}</div>
                      <div className="text-[10px] text-slate-400">{p.actedThisRound ? "대기" : "행동 예정"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 space-y-2 shadow-lg">
              <div className="text-sm font-semibold">액션 패널</div>
              <div className="grid gap-2">
                {[
                  { label: "이동", icon: "↗", onClick: () => requestCardBurn("이동") },
                  { label: "MP 충전", icon: "⚡", onClick: () => requestCardBurn("MP 충전") },
                  { label: "CP 액션", icon: "✦", onClick: () => requestCardBurn("CP 액션") },
                  { label: "크랙스킬", icon: "⟁", onClick: () => requestCardBurn("크랙스킬") },
                  { label: "턴 종료", icon: "■", onClick: endTurn },
                ].map((a) => (
                  <button
                    key={a.label}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-950 px-3 py-2 text-left text-sm hover:border-amber-300/50 hover:shadow-[0_6px_18px_rgba(255,184,107,0.25)] disabled:opacity-40"
                    onClick={a.onClick}
                    disabled={!myTurn && a.label !== "턴 종료"}
                  >
                    <span className="text-amber-200 text-base">{a.icon}</span>
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-slate-400">사용 시 패 한 장을 버리는 선택 UI가 필요합니다.</div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/85 p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>덱 / 버린 / 로그</span>
                <span className="text-[11px] text-slate-400">상호작용</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 hover:border-amber-300/40 hover:bg-slate-900"
                  onClick={() => {
                    setShowDeckPreview((v) => !v);
                    setShowDeckDetail(false);
                  }}
                >
                  덱 보기 ({me?.deck.length ?? 0})
                </button>
                <button
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 hover:border-amber-300/40 hover:bg-slate-900"
                  onClick={() => {
                    setShowDiscardPreview((v) => !v);
                    setShowDiscardDetail(false);
                  }}
                >
                  버린 ({me?.discard.length ?? 0})
                </button>
              </div>
              {showDeckPreview && (
                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-2 text-[11px] text-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>덱 상단 미리보기</span>
                    <button
                      className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/10"
                      onClick={() => setShowDeckDetail(true)}
                    >
                      자세히
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(me?.deck ?? []).slice(0, 5).map((c, i) => (
                      <span key={`${c}-${i}`} className="rounded-md border border-white/10 px-2 py-1">
                        {c}
                      </span>
                    ))}
                    {(me?.deck?.length ?? 0) === 0 && <span className="text-slate-400">카드 없음</span>}
                  </div>
                </div>
              )}
              {showDiscardPreview && (
                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-2 text-[11px] text-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>버린 카드 간단보기</span>
                    <button
                      className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/10"
                      onClick={() => setShowDiscardDetail(true)}
                    >
                      자세히
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(me?.discard ?? []).slice(0, 6).map((c, i) => (
                      <span key={`${c}-${i}`} className="rounded-md border border-white/10 px-2 py-1">
                        {c}
                      </span>
                    ))}
                    {(me?.discard?.length ?? 0) === 0 && <span className="text-slate-400">카드 없음</span>}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-slate-900/70 p-2 h-32 overflow-y-auto text-[11px] text-slate-300">
                {log || "로그 없음"}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {(showDeckDetail || showDiscardDetail) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-[520px] max-h-[80vh] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900 p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{showDeckDetail ? "덱 상세" : "버린 카드 상세"}</div>
              <button
                className="rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/10"
                onClick={() => {
                  setShowDeckDetail(false);
                  setShowDiscardDetail(false);
                }}
              >
                닫기
              </button>
            </div>
            <div className="grid gap-2 text-xs">
              {(showDeckDetail ? me?.deck : me?.discard)?.map((c, i) => (
                <div
                  key={`${c}-${i}`}
                  className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 flex items-center justify-between"
                >
                  <span className="font-semibold">{c}</span>
                  <span className="text-[11px] text-slate-400">확장 카드 확인 영역</span>
                </div>
              )) ?? <div className="text-slate-400">카드 없음</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className="text-[10px] text-slate-200">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
