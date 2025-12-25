import { shuffle, type PlayerState } from "./state.js";

export function reformIfNeeded(p: PlayerState) {
  if (p.deck.length > 0) return;

  if (p.discard.length === 0) return;

  p.deck = shuffle(p.discard);
  p.discard = [];
  p.cp += 1;
}

export function drawToHandSize(p: PlayerState, targetHandSize: number) {
  while (p.hand.length < targetHandSize) {
    if (p.deck.length === 0) reformIfNeeded(p);
    if (p.deck.length === 0) break;

    const top = p.deck.shift() as string;
    p.hand.push(top);
  }
}
