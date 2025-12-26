// apps/web/src/pages/GameRoom.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GameWS } from "../api/ws";

type Facing = "N" | "E" | "S" | "W";
type Vec2 = { x: number; y: number };

type CladAction =
  | { type: "attack"; offsets: Vec2[] }
  | { type: "summon"; offsets: Vec2[] }
  | { type: "vpDrop"; offsets: Vec2[] }
  | { type: "move"; offset: Vec2 }
  | { type: "turn"; dir: "left" | "right" }
  | { type: "special"; kind: "homecoming" };

type CladCard = { code: string; name: string; voltage: number; actions: CladAction[] };

const CLAD_CARDS: Record<string, CladCard> = {
  HacKClaD_Clad_Hydra_Backslam: {
    code: "HacKClaD_Clad_Hydra_Backslam",
    name: "Backslam",
    voltage: 1,
    actions: [
      { type: "attack", offsets: [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 0, y: -2 }] },
      { type: "vpDrop", offsets: [{ x: 0, y: -1 }] }
    ]
  },
  HacKClaD_Clad_Hydra_CrashingFootfallsLeft: {
    code: "HacKClaD_Clad_Hydra_CrashingFootfallsLeft",
    name: "Crashing Footfalls (L)",
    voltage: 3,
    actions: [
      {
        type: "attack",
        offsets: [
          { x: -1, y: -1 },
          { x: -1, y: -2 },
          { x: -1, y: 0 },
          { x: -1, y: 1 },
          { x: -1, y: 2 },
          { x: -2, y: -1 },
          { x: -2, y: -2 },
          { x: -2, y: 0 },
          { x: -2, y: 1 },
          { x: -2, y: 2 }
        ]
      },
      { type: "summon", offsets: [{ x: -1, y: 1 }] },
      { type: "vpDrop", offsets: [{ x: -1, y: 0 }, { x: -2, y: 0 }] },
      { type: "move", offset: { x: 0, y: 1 } }
    ]
  },
  HacKClaD_Clad_Hydra_CrashingFootfallsRight: {
    code: "HacKClaD_Clad_Hydra_CrashingFootfallsRight",
    name: "Crashing Footfalls (R)",
    voltage: 3,
    actions: [
      {
        type: "attack",
        offsets: [
          { x: 1, y: -1 },
          { x: 1, y: -2 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: -1 },
          { x: 2, y: -2 },
          { x: 2, y: 0 },
          { x: 2, y: 1 },
          { x: 2, y: 2 }
        ]
      },
      { type: "summon", offsets: [{ x: 1, y: 1 }] },
      { type: "vpDrop", offsets: [{ x: 1, y: 0 }, { x: 2, y: 0 }] },
      { type: "move", offset: { x: 0, y: 1 } }
    ]
  },
  HacKClaD_Clad_Hydra_HomecomingInstinct: {
    code: "HacKClaD_Clad_Hydra_HomecomingInstinct",
    name: "Homecoming Instinct",
    voltage: 3,
    actions: [
      { type: "special", kind: "homecoming" },
      { type: "summon", offsets: [{ x: 1, y: 2 }, { x: 2, y: -1 }, { x: -2, y: 1 }, { x: -1, y: -2 }] }
    ]
  },
  HacKClaD_Clad_Hydra_IncineratingFlames: {
    code: "HacKClaD_Clad_Hydra_IncineratingFlames",
    name: "Incinerating Flames",
    voltage: 2,
    actions: [
      {
        type: "attack",
        offsets: [
          { x: -2, y: 1 },
          { x: -2, y: 2 },
          { x: -1, y: 1 },
          { x: -1, y: 2 },
          { x: 0, y: 1 },
          { x: 0, y: 2 },
          { x: 1, y: 1 },
          { x: 1, y: 2 },
          { x: 2, y: 1 },
          { x: 2, y: 2 }
        ]
      },
      { type: "summon", offsets: [{ x: 0, y: 1 }] },
      { type: "turn", dir: "right" }
    ]
  },
  HacKClaD_Clad_Hydra_SavageFangs: {
    code: "HacKClaD_Clad_Hydra_SavageFangs",
    name: "Savage Fangs",
    voltage: 1,
    actions: [
      { type: "attack", offsets: [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }] },
      { type: "vpDrop", offsets: [{ x: 0, y: 1 }] },
      { type: "turn", dir: "left" }
    ]
  },
  HacKClaD_Clad_Hydra_ScorchingBreath: {
    code: "HacKClaD_Clad_Hydra_ScorchingBreath",
    name: "Scorching Breath",
    voltage: 1,
    actions: [
      { type: "attack", offsets: [{ x: -1, y: 2 }, { x: 0, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }] },
      { type: "vpDrop", offsets: [{ x: 0, y: 2 }] }
    ]
  },
  HacKClaD_Clad_Hydra_Skewer: {
    code: "HacKClaD_Clad_Hydra_Skewer",
    name: "Skewer",
    voltage: 1,
    actions: [{ type: "summon", offsets: [{ x: -1, y: 0 }, { x: 1, y: 0 }] }]
  },
  HacKClaD_Clad_Hydra_SpiralAmbushLeft: {
    code: "HacKClaD_Clad_Hydra_SpiralAmbushLeft",
    name: "Spiral Ambush (L)",
    voltage: 1,
    actions: [
      { type: "summon", offsets: [{ x: 1, y: 1 }] },
      { type: "turn", dir: "left" }
    ]
  },
  HacKClaD_Clad_Hydra_SpiralAmbushRight: {
    code: "HacKClaD_Clad_Hydra_SpiralAmbushRight",
    name: "Spiral Ambush (R)",
    voltage: 1,
    actions: [
      { type: "summon", offsets: [{ x: -1, y: 1 }] },
      { type: "turn", dir: "right" }
    ]
  },
  HacKClaD_Clad_Hydra_SweepingStrike: {
    code: "HacKClaD_Clad_Hydra_SweepingStrike",
    name: "Sweeping Strike",
    voltage: 2,
    actions: [
      {
        type: "attack",
        offsets: [
          { x: -1, y: 1 },
          { x: -1, y: 0 },
          { x: -1, y: -1 },
          { x: 1, y: 1 },
          { x: 1, y: 0 },
          { x: 1, y: -1 }
        ]
      },
      { type: "vpDrop", offsets: [{ x: 1, y: 1 }, { x: -1, y: 1 }] },
      { type: "move", offset: { x: 0, y: 1 } }
    ]
  },
  HacKClaD_Clad_Hydra_TerrainCrush: {
    code: "HacKClaD_Clad_Hydra_TerrainCrush",
    name: "Terrain Crush",
    voltage: 2,
    actions: [
      { type: "summon", offsets: [{ x: 0, y: -1 }] },
      { type: "move", offset: { x: 0, y: 1 } },
      { type: "move", offset: { x: 0, y: 1 } }
    ]
  }
};

function getCladCard(code: string): CladCard | null {
  return CLAD_CARDS[code] ?? null;
}

// Vite static import for card images
const CLAD_IMAGES = import.meta.glob("../assets/Clad_Hydra/*", { eager: true, as: "url" }) as Record<string, string>;

function cardImage(code: string) {
  const png = CLAD_IMAGES[`../assets/Clad_Hydra/${code}.png`];
  const webp = CLAD_IMAGES[`../assets/Clad_Hydra/${code}.webp`];
  const jpg = CLAD_IMAGES[`../assets/Clad_Hydra/${code}.jpg`];
  return png ?? webp ?? jpg ?? "";
}

// Player card images (Rosette-Δ)
const PLAYER_CARD_IMAGES = import.meta.glob("../assets/Character_Rosette_delta/{Standard,Enhanced}/*", {
  eager: true,
  as: "url"
}) as Record<string, string>;

const ROSETTE_CARD_DETAILS: Record<
  string,
  { name: string; type: string; mp: number; vp?: number; atk?: string; text: string; tag?: string }
> = {
  HacKClaD_Rosette_Delta_Cards_Shoot: {
    name: "Shoot",
    type: "Attack",
    mp: 1,
    vp: 1,
    atk: "ATK 1 · Range (0,1)(0,2) · Multistrike 2",
    text: "Hits up to 2 targets in range."
  },
  HacKClaD_Rosette_Delta_Cards_Block: {
    name: "Block",
    type: "Reaction",
    mp: 0,
    vp: 1,
    text: "Reduce incoming damage by 2."
  },
  HacKClaD_Rosette_Delta_Cards_Move: {
    name: "Advance",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "Move 1 space."
  },
  HacKClaD_Rosette_Delta_Cards_VitalBlow: {
    name: "Vital Blow",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 1 · Range (0,1)",
    text: "If attacking from the front, Repel the Clad after this attack."
  },
  HacKClaD_Rosette_Delta_Cards_Sweep: {
    name: "Sweep",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 1 · Range (0,1)",
    text: "While in discard: when you use your Crack Skill, return this card to your hand."
  },
  HacKClaD_Rosette_Delta_Cards_Lunge: {
    name: "Lunge",
    type: "Attack",
    mp: 0,
    vp: 1,
    atk: "ATK 2 · Range (0,1)",
    text: "Add +1 to your Injuries Gauge."
  },
  HacKClaD_Rosette_Delta_Cards_Determination: {
    name: "Determination",
    type: "Support",
    mp: 1,
    vp: 1,
    text: "Activate Unyielding."
  },
  HacKClaD_Rosette_Delta_Cards_Challenge: {
    name: "Challenge",
    type: "Support",
    mp: 0,
    vp: 1,
    text: "Adjacent only. Turn the Clad to face its front toward you."
  },
  HacKClaD_Rosette_Delta_Cards_Riposte: {
    name: "Riposte",
    type: "Attack",
    mp: 0,
    vp: 3,
    atk: "ATK 2 · Range (0,1)",
    text: "If attacking from the front: +1 ATK and discard the top card of your deck."
  },
  HacKClaD_Rosette_Delta_Cards_Impale: {
    name: "Impale",
    type: "Attack",
    mp: 0,
    vp: 4,
    atk: "ATK 2 · Range (0,1)",
    text: "After the attack, you may spend 1 CP to turn the Clad's front toward you."
  },
  HacKClaD_Rosette_Delta_Cards_Ratetsu: {
    name: "Ratetsu",
    type: "Attack",
    mp: 0,
    vp: 2,
    atk: "ATK 4 · Range (0,1)",
    text: "Add +1 to your Injuries Gauge."
  },
  HacKClaD_Rosette_Delta_Cards_Reversal: {
    name: "Reversal",
    type: "Attack",
    mp: 3,
    vp: 2,
    atk: "ATK 6 · Range (0,1)",
    text: "If Injuries ≥ 5: +1 ATK and Repel the Clad after this attack."
  },
  HacKClaD_Rosette_Delta_Cards_Reap: {
    name: "Reap",
    type: "Attack",
    mp: 1,
    vp: 4,
    atk: "ATK 2 · Range (-1,1)(0,1)(1,1) · Multistrike 2",
    text: "Hits up to 2 targets."
  },
  HacKClaD_Rosette_Delta_Cards_Carnage: {
    name: "Carnage",
    type: "Reaction",
    mp: 0,
    vp: 4,
    atk: "ATK 3 · Adjacent",
    text: "Adjacent only. Perform a 3 ATK attack to the Clad and activate Unyielding."
  },
  HacKClaD_Rosette_Delta_Cards_AuxillaryMana: {
    name: "Auxillary Mana",
    type: "Support",
    mp: 0,
    vp: 4,
    text: "Add +2 MP. You may spend 1 MP to activate Unyielding."
  },
  HacKClaD_Rosette_Delta_Cards_HundredDemons: {
    name: "Hundred Demons",
    type: "Support",
    mp: 1,
    vp: 3,
    text: "Discard top card; you may play it. You may perform your Crack Skill an additional time this turn."
  }
};


function playerCardImage(code: string) {
  const webpStd = PLAYER_CARD_IMAGES[`../assets/Character_Rosette_delta/Standard/${code}.webp`];
  const webpEnh = PLAYER_CARD_IMAGES[`../assets/Character_Rosette_delta/Enhanced/${code}.webp`];
  const pngStd = PLAYER_CARD_IMAGES[`../assets/Character_Rosette_delta/Standard/${code}.png`];
  const pngEnh = PLAYER_CARD_IMAGES[`../assets/Character_Rosette_delta/Enhanced/${code}.png`];
  return webpStd ?? webpEnh ?? pngStd ?? pngEnh ?? "";
}

function playerCardDetail(code: string) {
  return ROSETTE_CARD_DETAILS[code];
}

type GameState = {
  roomId?: string;
  mode: "pvp";
  round: number;
  phase: "forecast" | "draw" | "draft" | "action" | "scoring";
  voltage?: number;
  boss: {
    name?: string;
    hp: number;
    foresight: string[];
    voltage?: number;
    position?: { x: number; y: number };
    facing?: Facing;
  };
  actionQueue?: Array<{ type: "player"; userId: string } | { type: "boss"; cardIndex: number; cardCode: string }>;
  actionIndex?: number;
  currentTurn?: { type: "player"; userId: string } | { type: "boss"; cardIndex: number; cardCode: string } | null;
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
    chosenSlot?: number;
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
  const myTurn = canAct && state?.currentTurn?.type === "player" && state.currentTurn.userId === meId;
  const bossVoltage = state?.boss.voltage ?? state?.voltage;
  const bossActionCards = state?.boss.foresight.length
    ? state.boss.foresight.map((code) => getCladCard(code) ?? { code, name: code, voltage: 0, actions: [] })
    : [];
  const bossFacing = state?.boss.facing;
  const bossPosition = state?.boss.position;
  const actionQueue = state?.actionQueue ?? [];
  const actionIndex = state?.actionIndex ?? 0;
  const currentTurnLabel =
    state?.currentTurn?.type === "player"
      ? `Player: ${state.players.find((p) => p.userId === state.currentTurn?.userId)?.nickname ?? ""}`
      : state?.currentTurn?.type === "boss"
        ? `Clad Card ${state.currentTurn.cardIndex + 1}`
        : "대기";
  const [inspectCard, setInspectCard] = useState<{ code: string; type: "boss" | "player"; title?: string; voltage?: number } | null>(null);

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

  function chooseSlot(slot: 1 | 2 | 3 | 4) {
    if (!roomId) return;
    ws.send({ type: "pvp:chooseSlot", roomId, slot });
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
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200">
              Turn: {currentTurnLabel}
            </span>
            <button
              className="ml-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-xs hover:bg-white/20"
              onClick={() => nav("/lobby")}
            >
              로비
            </button>
          </div>
        </header>

        {state.phase === "draft" && (
          <div className="mt-3 rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-lg">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Draft Phase - 턴 슬롯 선택</span>
              <span className="text-[11px] text-slate-400">즉시 효과: 1 드로우 · 2 MP+1 · 3 드로우 후 1장 덱으로 · 4 CP+1</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[1, 2, 3, 4].map((slot) => {
                const takenBy = state.players.find((p) => p.chosenSlot === slot);
                const mine = me && me.chosenSlot === slot;
                const disabled = Boolean(takenBy && !mine);
                return (
                  <button
                    key={slot}
                    className={`rounded-xl border px-3 py-3 text-left text-sm ${
                      mine
                        ? "border-amber-400/70 bg-amber-500/10 text-amber-100"
                        : "border-white/10 bg-slate-900/70 text-slate-100 hover:border-amber-300/40"
                    } disabled:opacity-50`}
                    onClick={() => chooseSlot(slot as 1 | 2 | 3 | 4)}
                    disabled={disabled}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Slot {slot}</span>
                      {mine && <span className="text-[11px] text-amber-200">내 슬롯</span>}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-300">
                      {slot === 1 && "즉시 드로우 1"}
                      {slot === 2 && "MP +1"}
                      {slot === 3 && "드로우 1 후 1장 덱으로"}
                      {slot === 4 && "CP +1"}
                    </div>
                    {takenBy && !mine && (
                      <div className="mt-2 text-[11px] text-slate-400">선택: {takenBy.nickname}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                    {typeof bossVoltage === "number" ? ` · Voltage ${bossVoltage}` : ""}
                    {bossFacing ? ` · ${bossFacing}` : ""}
                    {bossPosition ? ` · (${bossPosition.x}, ${bossPosition.y})` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  {bossActionCards.length === 0 && <span className="text-slate-500">foresight 대기</span>}
                  {bossActionCards.slice(0, 3).map((c, i) => (
                    <button
                      key={c.code + i}
                      className="flex items-center gap-3 rounded-2xl border border-rose-300/40 bg-rose-500/20 px-3 py-2 shadow-sm hover:border-rose-200/70"
                      onClick={() => setInspectCard({ code: c.code, type: "boss", title: c.name, voltage: c.voltage })}
                    >
                      {cardImage(c.code) ? (
                        <img
                          src={cardImage(c.code)}
                          alt={c.name}
                          className="h-16 w-12 rounded-xl object-cover border border-rose-100/40 bg-slate-900/60 shadow-md"
                        />
                      ) : (
                        <div className="h-16 w-12 rounded-xl bg-slate-800 border border-rose-100/20" />
                      )}
                      <div className="flex flex-col leading-tight text-left">
                        <span className="text-rose-50 font-semibold text-sm">{c.name}</span>
                        <span className="text-[11px] text-amber-200">Voltage +{c.voltage}</span>
                      </div>
                    </button>
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
                  <div className="mt-3 flex flex-wrap gap-3 justify-center">
                    {me.hand.map((code, idx) => (
                      <button
                        key={code + idx}
                        className="group relative rounded-xl border border-amber-300/30 bg-gradient-to-br from-slate-900 to-slate-950 px-3 py-3 text-left text-sm shadow-[0_8px_20px_rgba(0,0,0,0.45)] hover:border-amber-300/60 hover:shadow-[0_10px_30px_rgba(255,184,107,0.25)] disabled:opacity-40 min-w-[150px] flex flex-col items-center gap-2"
                        onClick={() => setInspectCard({ code, type: "player" })}
                        disabled={!myTurn && false}
                        onMouseEnter={() => setHoveredCard(code)}
                        onMouseLeave={() => setHoveredCard((prev) => (prev === code ? null : prev))}
                      >
                        {playerCardImage(code) ? (
                          <img
                            src={playerCardImage(code)}
                            alt={code}
                            className="h-24 w-16 rounded-lg border border-amber-200/30 object-cover bg-slate-900/80"
                          />
                        ) : (
                          <div className="h-24 w-16 rounded-lg border border-dashed border-amber-200/30 bg-slate-900/40 text-[10px] text-slate-400 flex items-center justify-center">
                            이미지 없음
                          </div>
                        )}
                        <div className="text-[11px] text-amber-200">자세히 보기</div>
                      </button>
                    ))}
                    {me.hand.length === 0 && <div className="text-slate-400">카드 없음</div>}
                  </div>
                )}
              </div>
            </main>

          {/* 우측: 진행 순서 + 액션 + 로그 */}
          <aside className="space-y-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-4 shadow-lg">
            <div className="text-sm font-semibold">진행 순서</div>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto">
              {actionQueue.length === 0 && (
                <div className="min-w-[140px] rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                    대기 중
                  </div>
                )}
                {actionQueue.map((step, idx) => {
                  const isDone = idx < actionIndex;
                  const isCurrent = idx === actionIndex && state.phase === "action";
                  if (step.type === "player") {
                    const p = state.players.find((pl) => pl.userId === step.userId);
                    return (
                      <div
                        key={`q-${idx}`}
                        className={`flex min-w-[150px] items-center gap-3 rounded-2xl border px-3 py-2 text-xs ${
                          isCurrent
                            ? "border-amber-400/60 bg-amber-500/10"
                            : isDone
                              ? "border-white/5 bg-slate-900/40 text-slate-300"
                              : "border-white/10 bg-slate-900/60"
                        }`}
                      >
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400/50 to-sky-400/50" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p?.nickname ?? "Player"}</div>
                          <div className="text-[10px] text-slate-400">턴 {p?.chosenSlot ?? "-"}</div>
                        </div>
                      </div>
                    );
                  }

                  const card = getCladCard(step.cardCode) ?? { code: step.cardCode, name: step.cardCode, voltage: 0, actions: [] };
                  return (
                    <div
                      key={`q-${idx}`}
                      className={`flex min-w-[150px] items-center gap-3 rounded-2xl border px-3 py-2 text-xs ${
                        isCurrent
                          ? "border-rose-300/60 bg-rose-500/20"
                          : isDone
                            ? "border-rose-200/20 bg-slate-900/40 text-slate-300"
                            : "border-rose-300/40 bg-rose-500/20"
                      }`}
                    >
                      {cardImage(card.code) ? (
                        <img
                          src={cardImage(card.code)}
                          alt={card.name}
                          className="h-10 w-8 rounded-[10px] object-cover border border-rose-100/30 bg-slate-900/60"
                        />
                      ) : (
                        <div className="h-10 w-8 rounded-[10px] bg-slate-800 border border-rose-100/20" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-[12px]">{card.name}</div>
                        <div className="text-[11px] text-amber-100">Volt +{card.voltage}</div>
                      </div>
                    </div>
                  );
                })}
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

      {inspectCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-[420px] rounded-2xl border border-white/15 bg-slate-900/90 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">
                {inspectCard.title ?? inspectCard.code}
                {inspectCard.type === "boss" && typeof inspectCard.voltage === "number" ? ` · Voltage +${inspectCard.voltage}` : ""}
              </div>
              <button
                className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                onClick={() => setInspectCard(null)}
              >
                닫기
              </button>
            </div>

            <div className="mt-3 flex flex-col items-center gap-3">
                {inspectCard.type === "boss" ? (
                  cardImage(inspectCard.code) ? (
                    <img
                      src={cardImage(inspectCard.code)}
                      alt={inspectCard.title ?? inspectCard.code}
                      className="w-full max-w-[260px] rounded-xl border border-rose-200/40 shadow-lg"
                    />
                  ) : (
                    <div className="h-64 w-full max-w-[260px] rounded-xl border border-rose-200/40 bg-slate-800 flex items-center justify-center text-slate-400">
                      이미지 없음
                    </div>
                  )
                ) : playerCardImage(inspectCard.code) ? (
                  <img
                    src={playerCardImage(inspectCard.code)}
                    alt={inspectCard.code}
                    className="w-full max-w-[260px] rounded-xl border border-amber-200/40 shadow-lg"
                  />
                ) : (
                  <div className="h-64 w-full max-w-[260px] rounded-xl border border-amber-200/40 bg-slate-800 flex items-center justify-center text-slate-400">
                    이미지 없음
                  </div>
                )}

                {inspectCard.type === "player" && playerCardDetail(inspectCard.code) && (
                  <div className="w-full rounded-xl border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{playerCardDetail(inspectCard.code)?.type}</span>
                      <span className="text-[11px] text-amber-200">MP {playerCardDetail(inspectCard.code)?.mp}</span>
                    </div>
                    {playerCardDetail(inspectCard.code)?.atk && (
                      <div className="text-[12px] text-slate-200">{playerCardDetail(inspectCard.code)?.atk}</div>
                    )}
                    <div className="text-[12px] text-slate-100 whitespace-pre-line">{playerCardDetail(inspectCard.code)?.text}</div>
                    {typeof playerCardDetail(inspectCard.code)?.vp === "number" && (
                      <div className="text-[11px] text-emerald-200">VP {playerCardDetail(inspectCard.code)?.vp}</div>
                    )}
                  </div>
                )}

              {inspectCard.type === "player" && myTurn && (
                <button
                  className="w-full rounded-xl border border-amber-300/50 bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30"
                  onClick={() => {
                    playCard(inspectCard.code);
                    setInspectCard(null);
                  }}
                >
                  이 카드 사용하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
