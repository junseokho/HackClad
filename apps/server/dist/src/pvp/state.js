import { CLAD_DECK, SAMPLE_PLAYER_CARDS, STARTER_DECK_9 } from "./data.js";
export function shuffle(arr, rng = Math.random) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
    return a;
}
export function cardByCode(code) {
    const c = SAMPLE_PLAYER_CARDS.find((x) => x.code === code);
    if (!c)
        throw new Error(`unknown card: ${code}`);
    return c;
}
export function createPvpState(roomId, users) {
    const players = users.map((u) => {
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
//# sourceMappingURL=state.js.map