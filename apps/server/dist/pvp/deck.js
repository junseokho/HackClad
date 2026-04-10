import { shuffle } from "./state.js";
export function reformIfNeeded(p) {
    if (p.deck.length > 0)
        return;
    if (p.discard.length === 0)
        return;
    p.deck = shuffle(p.discard);
    p.discard = [];
    p.cp += 1;
}
export function drawToHandSize(p, targetHandSize) {
    while (p.hand.length < targetHandSize) {
        if (p.deck.length === 0)
            reformIfNeeded(p);
        if (p.deck.length === 0)
            break;
        const top = p.deck.shift();
        p.hand.push(top);
    }
}
//# sourceMappingURL=deck.js.map