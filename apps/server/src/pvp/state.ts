import { CLAD_DECK, SAMPLE_PLAYER_CARDS, STARTER_DECK_9, type CardDef, type CladCard } from "./data.js";

export type Phase = "forecast" | "draw" | "action" | "scoring";

export type PlayerState = {
  userId: string;
  nickname: string;

  deck: string[];
  discard: string[];
  hand: string[];

  mp: number;
  cp: number;
  injury: number;
  vp: number;

  ready: boolean;
  actedThisRound: boolean;
};

export type GameState = {
  roomId: string;
  mode: "pvp";
  round: number;
  phase: Phase;

  boss: {
    hp: number;
    maxHp: number;
    voltage: number;
    deck: CladCard[];
    discard: CladCard[];
    foresight: string[];
  };

  players: PlayerState[];
  finished: boolean;
};

export function shuffle<T>(arr: T[], rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

export function cardByCode(code: string): CardDef {
  const c = SAMPLE_PLAYER_CARDS.find((x) => x.code === code);
  if (!c) throw new Error(`unknown card: ${code}`);
  return c;
}

export function createPvpState(roomId: string, users: Array<{ userId: string; nickname: string }>): GameState {
  const players: PlayerState[] = users.map((u) => {
    const deck = shuffle(STARTER_DECK_9);
    return {
      userId: u.userId,
      nickname: u.nickname,
      deck,
      discard: [],
      hand: [],
      mp: 0,
      cp: 0,
      injury: 0,
      vp: 0,
      ready: false,
      actedThisRound: false
    };
  });

  const bossDeck = shuffle(CLAD_DECK);

  return {
    roomId,
    mode: "pvp",
    round: 1,
    phase: "forecast",
    boss: {
      hp: 50,
      maxHp: 50,
      voltage: 0,
      deck: bossDeck,
      discard: [],
      foresight: []
    },
    players,
    finished: false
  };
}
