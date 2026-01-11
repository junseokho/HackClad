import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CardSeed = {
  code: string;
  name: string;
  description: string;
  costMP: number;
  tags: string;
  effectJson: string;
};

const CARDS: CardSeed[] = [
  // Sample/basic cards kept for compatibility
  {
    code: "C_BASIC_STRIKE",
    name: "Basic Strike",
    description: "Deal 1 damage to the Clad. VP +1.",
    costMP: 0,
    tags: "basic,attack",
    effectJson: JSON.stringify({ kind: "damageBoss", amount: 1, vp: 1 })
  },
  {
    code: "C_BASIC_GUARD",
    name: "Basic Guard",
    description: "Reduce incoming damage by 1.",
    costMP: 0,
    tags: "basic,defense",
    effectJson: JSON.stringify({ kind: "guard", amount: 1 })
  },
  {
    code: "C_DRAW",
    name: "Quick Draw",
    description: "Draw 1 card.",
    costMP: 0,
    tags: "draw",
    effectJson: JSON.stringify({ kind: "draw", amount: 1 })
  },
  {
    code: "C_GAIN_MP",
    name: "Mana Trickle",
    description: "Gain 1 MP.",
    costMP: 0,
    tags: "resource",
    effectJson: JSON.stringify({ kind: "gainMP", amount: 1 })
  },

  // Rosette-Δ Standard
  {
    code: "HacKClaD_Rosette_Delta_Cards_Shoot",
    name: "Shoot",
    description: "Attack | Range (0,1)(0,2) | ATK 1, MP 1, VP 1. Multistrike 2 (hits up to 2 targets).",
    costMP: 1,
    tags: "rosette-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "Multistrike 2 (hits up to 2 targets in range)"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Block",
    name: "Block",
    description: "Reaction | ATK -, MP 0, VP 1. Reduce incoming damage by 2.",
    costMP: 0,
    tags: "rosette-delta,reaction,standard",
    effectJson: JSON.stringify({
      cardType: "reaction",
      guard: 2,
      vp: 1,
      mp: 0,
      notes: "Reduce the damage of an incoming attack by 2"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Move",
    name: "Advance",
    description: "Support | MP 0, VP 1. Move 1 space.",
    costMP: 0,
    tags: "rosette-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      move: 1,
      vp: 1,
      mp: 0,
      notes: "Move 1 space"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_VitalBlow",
    name: "Vital Blow",
    description: "Attack | Range (0,1) | ATK 1, MP 0, VP 1. If attacking from the front, Repel the Clad after this attack.",
    costMP: 0,
    tags: "rosette-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 1,
      vp: 1,
      mp: 0,
      notes: "If attacking the Clad from the front, Repel the Clad after this attack"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Sweep",
    name: "Sweep",
    description: "Attack | Range (0,1) | ATK 1, MP 0, VP 1. While in discard: when you use your Crack Skill, return this card to hand.",
    costMP: 0,
    tags: "rosette-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 1,
      vp: 1,
      mp: 0,
      notes: "While in discard: when you use your Crack Skill, return this card to your hand"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Lunge",
    name: "Lunge",
    description: "Attack | Range (0,1) | ATK 2, MP 0, VP 1. Add +1 to your Injuries Gauge.",
    costMP: 0,
    tags: "rosette-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 2,
      vp: 1,
      mp: 0,
      notes: "Add +1 to your Injuries Gauge after the attack"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Determination",
    name: "Determination",
    description: "Support | MP 1, VP 1. Activate Unyielding.",
    costMP: 1,
    tags: "rosette-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 1,
      notes: "Activate Unyielding"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Challenge",
    name: "Challenge",
    description: "Support | MP 0, VP 1. Adjacent only. Turn the Clad to face you.",
    costMP: 0,
    tags: "rosette-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 0,
      notes: "Only usable when the Clad is adjacent. Turn the Clad to face its front toward you"
    })
  },

  // Rosette-Δ Enhanced
  {
    code: "HacKClaD_Rosette_Delta_Cards_Riposte",
    name: "Riposte",
    description: "Attack | Range (0,1) | ATK 2, MP 0, VP 3. Front: +1 ATK and discard the top card of your deck.",
    costMP: 0,
    tags: "rosette-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 2,
      vp: 3,
      mp: 0,
      notes: "If attacking from the front: +1 ATK and discard the top card of your deck"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Impale",
    name: "Impale",
    description: "Attack | Range (0,1) | ATK 2, MP 0, VP 4. After attack, you may spend 1 CP to turn the Clad's front toward you.",
    costMP: 0,
    tags: "rosette-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 2,
      vp: 4,
      mp: 0,
      notes: "After the attack, you may spend 1 CP to turn the Clad's front toward you"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Ratetsu",
    name: "Ratetsu",
    description: "Attack | Range (0,1) | ATK 4, MP 0, VP 2. Add +1 to your Injuries Gauge.",
    costMP: 0,
    tags: "rosette-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 4,
      vp: 2,
      mp: 0,
      notes: "Add +1 to your Injuries Gauge after the attack"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Reversal",
    name: "Reversal",
    description: "Attack | Range (0,1) | ATK 6, MP 3, VP 2. If Injuries ≥ 5: +1 ATK and Repel after attack.",
    costMP: 3,
    tags: "rosette-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 6,
      vp: 2,
      mp: 3,
      notes: "If Injuries ≥ 5: this attack has +1 ATK and you Repel the Clad after this attack"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Reap",
    name: "Reap",
    description: "Attack | Range (-1,1)(0,1)(1,1) | ATK 2, MP 1, VP 4. Multistrike 2.",
    costMP: 1,
    tags: "rosette-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: -1, y: 1 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ],
      atk: 2,
      vp: 4,
      mp: 1,
      notes: "Multistrike 2"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_Carnage",
    name: "Carnage",
    description: "Reaction | MP 0, VP 4. Adjacent only. Perform 3 ATK attack and activate Unyielding.",
    costMP: 0,
    tags: "rosette-delta,reaction,enhanced",
    effectJson: JSON.stringify({
      cardType: "reaction",
      range: [{ x: 0, y: 1 }],
      atk: 3,
      vp: 4,
      mp: 0,
      notes: "Adjacent only. Perform a 3 ATK attack to the Clad and activate Unyielding"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_AuxillaryMana",
    name: "Auxillary Mana",
    description: "Support | MP 0, VP 4. Add +2 MP. You may spend 1 MP to activate Unyielding.",
    costMP: 0,
    tags: "rosette-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      gainMp: 2,
      vp: 4,
      mp: 0,
      notes: "Add +2 to your MP Gauge. You may spend 1 MP to activate Unyielding"
    })
  },
  {
    code: "HacKClaD_Rosette_Delta_Cards_HundredDemons",
    name: "Hundred Demons",
    description: "Support | MP 1, VP 3. Discard top card; you may play it. Perform your Crack Skill an additional time this turn.",
    costMP: 1,
    tags: "rosette-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 3,
      mp: 1,
      notes: "Discard the top card of your deck; you may play it. You may perform your Crack Skill an additional time this turn"
    })
  },

  // Flare-Δ Standard
  {
    code: "HacKClaD_Flare_Delta_Cards_Shoot",
    name: "Shoot",
    description: "Attack | Range (0,1)(0,2) | ATK 1, MP 1, VP 1. Multistrike 2 (hits up to 2 targets).",
    costMP: 1,
    tags: "flare-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "Multistrike 2 (hits up to 2 targets in range)"
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_Block",
    name: "Block",
    description: "Reaction | MP 0, VP 1. Reduce the damage of an incoming attack by 2.",
    costMP: 0,
    tags: "flare-delta,reaction,standard",
    effectJson: JSON.stringify({
      cardType: "reaction",
      guard: 2,
      vp: 1,
      mp: 0,
      notes: "Reduce the damage of an incoming attack by 2"
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_Move",
    name: "Move",
    description: "Support | MP 0, VP 1. Move 1 space.",
    costMP: 0,
    tags: "flare-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      move: 1,
      vp: 1,
      mp: 0,
      notes: "Move 1 space"
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_BastionBattery",
    name: "Bastion Battery",
    description: 'Attack | Range (0,1)(0,2) | ATK 1, MP 0, VP 1. If discarded for "-1 DMG" Basic Action, also perform Intercept 1.',
    costMP: 0,
    tags: "flare-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 0,
      notes: 'If discarded for the "-1 DMG" Basic Action, also perform Intercept 1'
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_Cannonade",
    name: "Cannonade",
    description: "Attack | Range (0,1)(0,2) | ATK 1, MP 0, VP 1. If you did not move this turn, you may give this card +1 ATK; if so, you cannot move this turn.",
    costMP: 0,
    tags: "flare-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 0,
      notes: "If you did not move this turn, you may give this card +1 ATK. If you do, you cannot move for the rest of this turn."
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_ConcussionSalvo",
    name: "Concussion Salvo",
    description: "Attack | Range (-1,2)(0,2)(1,2) | ATK 1, MP 0, VP 1. For the rest of the round, the Clad cannot move or be repelled (orientation can change).",
    costMP: 0,
    tags: "flare-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: -1, y: 2 },
        { x: 0, y: 2 },
        { x: 1, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 0,
      notes: "For the remainder of the round, the Clad cannot move or be repelled (orientation can still change)"
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_GantryShield",
    name: "Gantry Shield",
    description: "Support | MP 1, VP 1. Perform Intercept 2. Reduce incoming attack damage by 2.",
    costMP: 1,
    tags: "flare-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 1,
      notes: "Perform Intercept 2 and reduce the damage of an incoming attack by 2"
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_SteadyPositions",
    name: "Steady Positions",
    description: "Support | MP 0, VP 1. Next time you would take damage this round, reduce by 2. If you did not move this turn, +1 CP and end your turn immediately.",
    costMP: 0,
    tags: "flare-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 0,
      notes: "Next damage you take this round is reduced by 2. If you did not move this turn, add +1 CP and end your turn immediately"
    })
  },

  // Flare-Δ Enhanced
  {
    code: "HacKClaD_Flare_Delta_Cards_RetaliatingBarrage",
    name: "Retaliating Barrage",
    description: 'Attack | Range (-1,2)(0,2)(1,2) | ATK 2, MP 0, VP 3. If discarded for "-1 DMG" Basic Action, also perform Intercept 3.',
    costMP: 0,
    tags: "flare-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: -1, y: 2 },
        { x: 0, y: 2 },
        { x: 1, y: 2 }
      ],
      atk: 2,
      vp: 3,
      mp: 0,
      notes: 'If you discarded this card to perform the "-1 DMG" Basic Action, also perform Intercept 3'
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_PinpointRocketCannon",
    name: "Pinpoint Rocket Cannon",
    description: "Attack | Range (0,1)(0,2) | ATK 2, MP 1, VP 3. Add +1 to your CP Gauge.",
    costMP: 1,
    tags: "flare-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 2,
      vp: 3,
      mp: 1,
      gainCp: 1,
      notes: "After attack, add +1 to your CP Gauge"
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_LightpulsarPayload",
    name: "Lightpulsar Payload",
    description: "Attack | Range (0,2) | ATK 5+X, MP 2, VP 2. Extra cost: spend any amount of CP. X equals CP spent.",
    costMP: 2,
    tags: "flare-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 2 }],
      atk: 5,
      vp: 2,
      mp: 2,
      notes: "Extra Cost: spend any amount of CP. X equals the CP spent (damage becomes 5+X)"
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_LeadDownpour",
    name: "Lead Downpour",
    description: "Attack | Range (-1,1)(-1,2)(0,1)(0,2)(1,1)(1,2) | ATK 2, MP 3, VP 2. Multistrike 3. You may spend 3 CP for +1 ATK.",
    costMP: 3,
    tags: "flare-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: -1, y: 1 },
        { x: -1, y: 2 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 1 },
        { x: 1, y: 2 }
      ],
      atk: 2,
      vp: 2,
      mp: 3,
      notes: "Multistrike 3. As an additional cost, you may spend 3 CP; if you do, this card has +1 ATK"
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_Logistics",
    name: "Logistics",
    description: "Reaction | MP 0, VP 4. Choose 2 different options: reduce damage by 2; draw a card; return 1 card from discard to hand.",
    costMP: 0,
    tags: "flare-delta,reaction,enhanced",
    effectJson: JSON.stringify({
      cardType: "reaction",
      vp: 4,
      mp: 0,
      notes: "Choose 2 different: reduce incoming damage by 2; draw a card; return 1 card from your discard pile to your hand"
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_AuxillaryMana",
    name: "Auxillary Mana",
    description: 'Support | MP 0, VP 4. Add +2 MP. If discarded for "-1 DMG" Basic Action, also perform Intercept 2.',
    costMP: 0,
    tags: "flare-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      gainMp: 2,
      vp: 4,
      mp: 0,
      notes: 'Add +2 MP. If discarded for the "-1 DMG" Basic Action, also perform Intercept 2'
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_MaelstromFormation",
    name: "Maelstrom Formation",
    description: 'Support | MP 0, VP 3. If discarded for "-1 DMG" Basic Action, +1 CP. While in discard: when you perform a Reaction without spending CP, +1 CP.',
    costMP: 0,
    tags: "flare-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 3,
      mp: 0,
      notes: 'When discarded for "-1 DMG" Basic Action, add +1 CP. While in discard: when you perform a Reaction (including Basic Actions) without spending CP, add +1 CP'
    })
  },
  {
    code: "HacKClaD_Flare_Delta_Cards_DesignatedFirePoint",
    name: "Designated Fire Point",
    description: "Support | MP 0, VP 3. You cannot move for the rest of the turn. Your next Attack/Attack Magic card gains +1 ATK and is always within Range.",
    costMP: 0,
    tags: "flare-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 3,
      mp: 0,
      notes: "You cannot move for the rest of the turn. Your next Attack or Attack Magic card gains +1 ATK and is always considered to be within Range"
    })
  },

  // Luna-Δ Standard
  {
    code: "HacKClaD_Luna_Delta_Cards_Shoot",
    name: "Shoot",
    description: "Attack | Range (0,1)(0,2) | ATK 1, MP 1, VP 1. Multistrike 2 (hits up to 2 targets).",
    costMP: 1,
    tags: "luna-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "Multistrike 2 (hits up to 2 targets in range)"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_Block",
    name: "Block",
    description: "Reaction | MP 0, VP 1. Reduce the damage of an incoming attack by 2.",
    costMP: 0,
    tags: "luna-delta,reaction,standard",
    effectJson: JSON.stringify({
      cardType: "reaction",
      guard: 2,
      vp: 1,
      mp: 0,
      notes: "Reduce the damage of an incoming attack by 2"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_Move",
    name: "Move",
    description: "Support | MP 0, VP 1. Move 1 space.",
    costMP: 0,
    tags: "luna-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      move: 1,
      vp: 1,
      mp: 0,
      notes: "Move 1 space"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_RuinBlade",
    name: "Ruin Blade",
    description: "Attack | Range (0,1) | ATK 1, MP 0, VP 1. If targeting the Clad, this card has +1 ATK.",
    costMP: 0,
    tags: "luna-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 1,
      vp: 1,
      mp: 0,
      notes: "If targeting the Clad, this card has +1 ATK"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_Thunderbolt",
    name: "Thunderbolt",
    description: "Attack | Range (-1,2)(0,1)(0,2)(1,2) | ATK 1, MP 1, VP 1. If you played an Attack/Attack Magic this turn, +1 ATK.",
    costMP: 1,
    tags: "luna-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: -1, y: 2 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "If you played an Attack or Attack Magic card this turn, this card has +1 ATK"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_Condemn",
    name: "Condemn",
    description: "Attack | Range (0,2)(1,2) | ATK 1, MP 1, VP 1. Look top of Clad deck; if reveal Voltage 1 or deck empty, +1 ATK.",
    costMP: 1,
    tags: "luna-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 2 },
        { x: 1, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "Look at top of Clad deck (reveal optional). If you reveal Voltage 1 or the deck is empty, this card has +1 ATK"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_Tsukuyomi",
    name: "Tsukuyomi",
    description: "Support | MP 0, VP 1. Add +2 MP. Perform Divination.",
    costMP: 0,
    tags: "luna-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      gainMp: 2,
      vp: 1,
      mp: 0,
      notes: "Add +2 MP. Perform Divination"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_ChasingMelody",
    name: "Chasing Melody",
    description: "Support | MP 0, VP 1. The next Attack/Attack Magic card this turn gains Multistrike 2.",
    costMP: 0,
    tags: "luna-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 0,
      notes: "The next Attack or Attack Magic card used this turn gains Multistrike 2"
    })
  },

  // Luna-Δ Enhanced
  {
    code: "HacKClaD_Luna_Delta_Cards_Thunderstep",
    name: "Thunderstep",
    description: "Attack | Range (-1,2)(0,2)(1,2) | ATK 3, MP 2, VP 3. If you destroy a Legion, you may move to its space.",
    costMP: 2,
    tags: "luna-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: -1, y: 2 },
        { x: 0, y: 2 },
        { x: 1, y: 2 }
      ],
      atk: 3,
      vp: 3,
      mp: 2,
      notes: "If you destroy a Legion with this attack, you may move to the space it was on (choose one if multiple)"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_EverchangingMagatama",
    name: "Everchanging Magatama",
    description: "Attack | Range (0,1)(0,2) | ATK 2, MP 1, VP 3. Look top of Clad deck; if Voltage 1 or empty, +1 ATK.",
    costMP: 1,
    tags: "luna-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 2,
      vp: 3,
      mp: 1,
      notes: "Look at the top card of the Clad deck (reveal optional). If you reveal Voltage 1, or the deck is empty, this card has +1 ATK"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_HeavenlySwordOfGatheringClouds",
    name: "Heavenly Sword Of Gathering Clouds",
    description: "Attack | Range (0,1) | ATK 6, MP 2, VP 3. This attack can only target the Clad.",
    costMP: 2,
    tags: "luna-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 6,
      vp: 3,
      mp: 2,
      notes: "This Attack can only target the Clad"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_Takemikazuchi",
    name: "Takemikazuchi",
    description: "Attack | Range (-1,2)(0,1)(0,2)(1,2) | ATK 4+X, MP 3, VP 2. X = Support/Support Magic cards played this turn (no Basic Actions).",
    costMP: 3,
    tags: "luna-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: -1, y: 2 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 }
      ],
      atk: 4,
      vp: 2,
      mp: 3,
      notes: "X equals the number of Support/Support Magic cards played this turn (Basic Actions do not count). Attack deals 4+X"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_OctspanMirror",
    name: "Octspan Mirror",
    description: "Reaction | MP 1, VP 4. Reverse the orientation of the Clad.",
    costMP: 1,
    tags: "luna-delta,reaction,enhanced",
    effectJson: JSON.stringify({
      cardType: "reaction",
      vp: 4,
      mp: 1,
      notes: "Reverse the orientation of the Clad"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_AuxillaryMana",
    name: "Auxillary Mana",
    description: "Support | MP 0, VP 4. Add +2 MP. You may spend 1 MP to perform Divination.",
    costMP: 0,
    tags: "luna-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      gainMp: 2,
      vp: 4,
      mp: 0,
      notes: "Add +2 MP. You may spend 1 MP to perform Divination"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_SoaringHeights",
    name: "Soaring Heights",
    description: "Support | MP 0, VP 4. Perform Divination. You may move to an unoccupied space adjacent to the Clad.",
    costMP: 0,
    tags: "luna-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 4,
      mp: 0,
      notes: "Perform Divination. You may move to an unoccupied space adjacent to the Clad"
    })
  },
  {
    code: "HacKClaD_Luna_Delta_Cards_Invocation",
    name: "Invocation",
    description: "Support | MP 1, VP 4. Return a Support/Support Magic card from discard to hand. Next Attack/Attack Magic this turn gains +1 ATK.",
    costMP: 1,
    tags: "luna-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 4,
      mp: 1,
      notes: "Choose a Support or Support Magic card from your discard pile and return it to your hand. Your next Attack/Attack Magic card this turn gains +1 ATK"
    })
  },

  // Mia-Δ Standard (Kunai has 2 copies)
  {
    code: "HacKClaD_Mia_Delta_Cards_Shoot",
    name: "Shoot",
    description: "Attack | Range (0,1)(0,2) | ATK 1, MP 1, VP 1. Multistrike 2 (hits up to 2 targets).",
    costMP: 1,
    tags: "mia-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "Multistrike 2 (hits up to 2 targets in range)"
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_Block",
    name: "Block",
    description: "Reaction | MP 0, VP 1. Reduce the damage of an incoming attack by 2.",
    costMP: 0,
    tags: "mia-delta,reaction,standard",
    effectJson: JSON.stringify({
      cardType: "reaction",
      guard: 2,
      vp: 1,
      mp: 0,
      notes: "Reduce the damage of an incoming attack by 2"
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_Move",
    name: "Move",
    description: "Support | MP 0, VP 1. Move 1 space.",
    costMP: 0,
    tags: "mia-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      move: 1,
      vp: 1,
      mp: 0,
      notes: "Move 1 space"
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_Kunai",
    name: "Kunai",
    description: "Attack | Range (0,1) | ATK 1, MP 0, VP 1.",
    costMP: 0,
    tags: "mia-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 1,
      vp: 1,
      mp: 0,
      notes: "No additional effect"
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_Kunai2",
    name: "Kunai",
    description: "Attack | Range (0,1) | ATK 1, MP 0, VP 1. (Second copy)",
    costMP: 0,
    tags: "mia-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 1,
      vp: 1,
      mp: 0,
      notes: "No additional effect"
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_Shuriken",
    name: "Shuriken",
    description: "Attack | Range (0,2) | ATK 1, MP 1, VP 1. After attack, discard this face-down on your Turn Card; when you draw it, draw both.",
    costMP: 1,
    tags: "mia-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 2 }],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "After the Attack, discard this card face-down on your Turn Card. When you draw your Turn Card, draw both cards."
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_SummonTrap",
    name: "Summon Trap",
    description: "Support | MP 0, VP 1. Flip a face-down Conibear Trap face-up.",
    costMP: 0,
    tags: "mia-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 0,
      notes: "Flip a face-down Conibear Trap face-up"
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_IllusoryArts",
    name: "Illusory Arts",
    description: "Support | MP 0, VP 1. Only usable when the Clad is adjacent. Turn the Clad's back toward you.",
    costMP: 0,
    tags: "mia-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 0,
      notes: "Only usable when the Clad is adjacent to you. Turn the Clad's back toward you"
    })
  },

  // Mia-Δ Enhanced
  {
    code: "HacKClaD_Mia_Delta_Cards_Stealth",
    name: "Stealth",
    description: "Attack | Range (0,1) | ATK 1, MP 0, VP 3. If attacking from behind the Clad, draw a card (once per round).",
    costMP: 0,
    tags: "mia-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 1,
      vp: 3,
      mp: 0,
      notes: "If attacking from behind the Clad, draw a card. This effect can only be triggered once per round."
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_Mawashigeri",
    name: "Mawashigeri",
    description: "Attack | Range (0,1) | ATK 2, MP 0, VP 3. If attacking from behind the Clad, flip a face-down Conibear Trap face-up.",
    costMP: 0,
    tags: "mia-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 2,
      vp: 3,
      mp: 0,
      notes: "If attacking from behind the Clad, flip a face-down Conibear Trap face-up"
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_WeaponForaging",
    name: "Weapon Foraging",
    description: "Attack | Range (0,1) | ATK 2, MP 1, VP 2. Return all Kunai from the discard pile to your hand.",
    costMP: 1,
    tags: "mia-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 2,
      vp: 2,
      mp: 1,
      notes: "Return all Kunai from the discard pile to your hand"
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_Heelstomp",
    name: "Heelstomp",
    description: "Attack | Range (0,1) | ATK 4, MP 2, VP 3. Extra Cost: you may discard a Kunai; if you did, +1 ATK and Repel after attack.",
    costMP: 2,
    tags: "mia-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [{ x: 0, y: 1 }],
      atk: 4,
      vp: 3,
      mp: 2,
      notes: "Extra Cost: you may discard a Kunai from your hand. If you did, this card has +1 ATK and you Repel the Clad after this attack."
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_Substitute",
    name: "Substitute",
    description: "Reaction | MP 0, VP 4. Extra Cost: flip a Conibear Trap face-down. Choose an unoccupied space and move there (counts as moving 1).",
    costMP: 0,
    tags: "mia-delta,reaction,enhanced",
    effectJson: JSON.stringify({
      cardType: "reaction",
      vp: 4,
      mp: 0,
      notes: "Extra Cost: flip a Conibear Trap face-down. Choose an unoccupied space and move there. This counts as moving 1 space."
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_ConvergenceSeal",
    name: "Convergence Seal",
    description: "Support | MP 0, VP 3. When sent to discard: if you have dealt at least 4 damage to the Clad/Legions this turn, deal 3 damage to the Clad (once/turn).",
    costMP: 0,
    tags: "mia-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 3,
      mp: 0,
      notes: "When this card is sent to the discard pile, if you have dealt at least 4 damage to the Clad and/or Legions this turn, deal 3 damage to the Clad. This effect can only be activated once per turn."
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_AuxillaryMana",
    name: "Auxillary Mana",
    description: "Support | MP 0, VP 4. Add +2 MP. You may spend 1 MP to flip a face-down Conibear Trap face-up.",
    costMP: 0,
    tags: "mia-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      gainMp: 2,
      vp: 4,
      mp: 0,
      notes: "Add +2 MP. You may spend 1 MP to flip a face-down Conibear Trap face-up"
    })
  },
  {
    code: "HacKClaD_Mia_Delta_Cards_Tsujigiri",
    name: "Tsujigiri",
    description: "Support | MP 1, VP 3. Move 2 (can move past Witches/Clad/Legions). Deal 2 damage to each Clad/Legion passed through and collect any Magic Shards passed through.",
    costMP: 1,
    tags: "mia-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 3,
      mp: 1,
      notes: "Move 2. This can move past other Witches, the Clad, and Legions. Deal 2 damage to each Clad or Legion passed through. Collect any Magic Shards passed through."
    })
  },

  // Amelia-Δ Standard
  {
    code: "HacKClaD_Amelia_Delta_Cards_Shoot",
    name: "Shoot",
    description: "Attack | Range (0,1)(0,2) | ATK 1, MP 1, VP 1. Multistrike 2 (hits up to 2 targets).",
    costMP: 1,
    tags: "amelia-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "Multistrike 2 (hits up to 2 targets in range)"
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_Block",
    name: "Block",
    description: "Reaction | MP 0, VP 1. Reduce the damage of an incoming attack by 2.",
    costMP: 0,
    tags: "amelia-delta,reaction,standard",
    effectJson: JSON.stringify({
      cardType: "reaction",
      guard: 2,
      vp: 1,
      mp: 0,
      notes: "Reduce the damage of an incoming attack by 2"
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_Move",
    name: "Move",
    description: "Support | MP 0, VP 1. Perform Maneuver: Movement / Harvest / Assault (choose one).",
    costMP: 0,
    tags: "amelia-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 0,
      notes: "Perform Maneuver: Movement / Harvest / Assault (choose one option)."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_SteelstringTransmutation",
    name: "Steelstring Transmutation",
    description: "Attack | Range (0,1)(0,2) | ATK 1, MP 1, VP 1. This card has +1 ATK for every 3 cards in your discard pile.",
    costMP: 1,
    tags: "amelia-delta,attack,standard",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "This card has +1 ATK for every 3 cards in your discard pile."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_Tsuchikumo",
    name: "Tsuchikumo",
    description: "Support | MP 0, VP 1. Perform Maneuver: Deployment. Move up to 1 space.",
    costMP: 0,
    tags: "amelia-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 0,
      notes: "Perform Maneuver: Deployment. Then move up to 1 space."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_ActiviationProtocol",
    name: "Activiation Protocol",
    description: "Support | ATK 1, MP 1, VP 1. After the Attack, discard this card face-down on your Turn Card. When you draw your Turn Card, draw both cards.",
    costMP: 1,
    tags: "amelia-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      range: [
        { x: 0, y: 1 }
      ],
      atk: 1,
      vp: 1,
      mp: 1,
      notes: "After the Attack, discard this card face-down on your Turn Card. When you draw your Turn Card, draw both cards."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_Investigate",
    name: "Investigate",
    description: "Support | MP 0, VP 1. You may perform Maneuver: Movement. Look at the top card of your deck; you may discard it.",
    costMP: 0,
    tags: "amelia-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 0,
      notes: "You may perform Maneuver: Movement. Look at the top card of your deck. You may discard that card."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_Experiment",
    name: "Experiment",
    description: "Support | MP 0, VP 1. Extra Cost: Remove a Tsuchikumo from the board. Add a random card from your Enhanced Deck to your discard pile (increases max deck size).",
    costMP: 0,
    tags: "amelia-delta,support,standard",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 1,
      mp: 0,
      notes: "Extra Cost: Remove a Tsuchikumo from the board. Add a random card from your Enhanced Deck to your discard pile (increases your maximum deck size)."
    })
  },

  // Amelia-Δ Enhanced
  {
    code: "HacKClaD_Amelia_Delta_Cards_ElectromagneticCannon",
    name: "Electromagnetic Cannon",
    description: "Attack | Range (0,1)(0,2) | ATK X, MP 1, VP 2. X is (cards in discard pile - 3), minimum 0.",
    costMP: 1,
    tags: "amelia-delta,attack,enhanced",
    effectJson: JSON.stringify({
      cardType: "attack",
      range: [
        { x: 0, y: 1 },
        { x: 0, y: 2 }
      ],
      atk: 1,
      vp: 2,
      mp: 1,
      notes: "X equals the number of cards in your discard pile minus 3 (cannot be below 0)."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_AuxillaryMana",
    name: "Auxillary Mana",
    description: "Support | MP 0, VP 4. Add +2 MP. You may spend 1 MP to perform Maneuver: Deployment / Movement / Harvest / Assault (choose one).",
    costMP: 0,
    tags: "amelia-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      gainMp: 2,
      vp: 4,
      mp: 0,
      notes: "Add +2 to your MP Gauge. You may spend 1 MP to perform Maneuver: Deployment / Movement / Harvest / Assault."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_DefenseNetwork",
    name: "Defense Network",
    description: "Support | MP 0, VP 4. Perform Maneuver: Deployment. While in discard: reduce incoming damage by X, where X is the number of Tsuchikumo influencing your space.",
    costMP: 0,
    tags: "amelia-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 4,
      mp: 0,
      notes: "Perform Maneuver: Deployment. While in discard: Reduce the damage of incoming attacks by X, where X is the amount of Tsuchikumo whose influence includes your space."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_GatlingStorm",
    name: "Gatling Storm",
    description: "Support | MP 0, VP 3. Perform Maneuver: Assault two times. If you have 5+ Tsuchikumo deployed, perform Maneuver: Assault an additional time.",
    costMP: 0,
    tags: "amelia-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 3,
      mp: 0,
      notes: "Perform Maneuver: Assault twice. If you have 5 or more Tsuchikumo deployed, perform Maneuver: Assault an additional time."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_MultithreadedOperations",
    name: "Multithreaded Operations",
    description: "Support | MP 1, VP 2. During this turn, Tsuchikumo deal +1 damage to the Clad and Legions (stackable). While in discard: once/turn, you may perform Maneuver: Movement / Harvest / Assault.",
    costMP: 1,
    tags: "amelia-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 2,
      mp: 1,
      notes: "During this turn, Tsuchikumo deal +1 damage to the Clad and Legions (this effect can stack). While in discard: once per turn, you may perform Maneuver: Movement / Harvest / Assault."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_DeepDelve",
    name: "Deep Delve",
    description: "Support | MP 1, VP 3. Add +1 to your CP Gauge. If your deck has 5 or more cards, draw a card.",
    costMP: 1,
    tags: "amelia-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 3,
      mp: 1,
      gainCp: 1,
      notes: "Add +1 to your CP Gauge. If your deck has 5 or more cards, draw a card."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_Reboot",
    name: "Reboot",
    description: "Support | MP 1, VP 3. Choose a card from your discard pile and return it to your hand.",
    costMP: 1,
    tags: "amelia-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 3,
      mp: 1,
      notes: "Choose a card from your discard pile and return it to your hand."
    })
  },
  {
    code: "HacKClaD_Amelia_Delta_Cards_Transfiguration",
    name: "Transfiguration",
    description: "Support | MP 2, VP 2. You cannot reshuffle your deck until end of turn. Remove up to X Tsuchikumo from the board (X = cards currently in deck). Draw as many cards as Tsuchikumo were removed.",
    costMP: 2,
    tags: "amelia-delta,support,enhanced",
    effectJson: JSON.stringify({
      cardType: "support",
      vp: 2,
      mp: 2,
      notes: "You cannot reshuffle your deck until the end of your turn. Remove up to X Tsuchikumo from the board (X equals the number of cards currently in the deck). Draw as many cards as Tsuchikumo were removed."
    })
  }
];

async function main() {
  for (const c of CARDS) {
    await prisma.card.upsert({
      where: { code: c.code },
      update: c,
      create: c
    });
  }

  // Remove legacy sample characters (Witch A/B) if they exist
  await prisma.character.deleteMany({ where: { code: { in: ["CH_WITCH_A", "CH_WITCH_B"] } } });

    // Characters
  const characters = [
    {
      code: "CH_ROSETTE_DELTA",
      name: "Rosette-\u0394",
      description:
        "Basic actions: +1 Move (2/turn), +1 MP (2/turn), -1 DMG (1/turn). All basic actions discard 1 card. CP: 1CP reduce damage by 1 (Reaction); 2CP +1 Move or +1 MP (Support); 4CP draw 1 (Support). Crack Skill Aomagakagi (Reaction, 1CP, once/round): gain 1 Corruption, move 0-1, your attack/attack-spell cards gain +1 ATK this turn. Passive Indomitable Spirit: when you use a skill, activate Unyielding; until end of round, taking injury does not drop VP shards (other injury effects still apply).",
      imageUrl: "/assets/Character_Rosette_delta/Illust/Rosette_Delta_Portrait.webp"
    },
    {
      code: "CH_FLARE_DELTA",
      name: "Flare-\u0394",
      description:
        "Basic actions: +1 Move (1/turn), +1 MP (2/turn), -1 DMG (2/turn). All basic actions discard 1 card. CP actions: 1CP reduce damage by 1 (Reaction); 2CP +1 Move or +1 MP (Support); 4CP draw 1 (Support). Crack Skill Hope's Beacon (Reaction, 1CP, once/round): gain 1 Corruption, gain Intercept 3, reduce incoming damage by 2. Passive Counter-battery: when you perform Intercept X, deal ATK X to the attacking Clad/Legion (does not trigger on Clad moves or unstoppable summons; if this damage would destroy the legion, its attack does not happen).",
      imageUrl: "/assets/Character_Flala_delta/Illust/Flare_Delta_Portrait.webp"
    },
    {
      code: "CH_LUNA_DELTA",
      name: "Luna-\u0394",
      description:
        "Basic actions: +1 Move (1/turn), +1 MP (2/turn), -1 DMG (2/turn). All basic actions discard 1 card. CP actions: 1CP reduce damage by 1 (Reaction); 2CP +1 Move or +1 MP (Support); 4CP draw 1 (Support). Crack Skill Innveration Kagura (Support, 1CP, once/round): gain 1 Corruption, recover 5 MP. Passive Scrying Futures: when you use a skill, perform Divination (peek top of Clad deck; if empty, gain +1 MP).",
      imageUrl: "/assets/Character_Luna_delta/Illust/Luna_Delta_Portrait.webp"
    },
    {
      code: "CH_MIA_DELTA",
      name: "Mia-\u0394",
      description:
        "Basic actions: +1 Move (3/turn), +1 MP (1/turn), -1 DMG (1/turn). All basic actions discard 1 card. CP actions: 1CP reduce damage by 1 (Reaction); 2CP +1 Move or +1 MP (Support); 4CP draw 1 (Support). Crack Skill Lykos Shinobi (Support, 1CP, once/round; usable only if you dealt >=3 damage to the Clad/Legions this round): gain 1 Corruption; for the rest of the round, whenever you gain a Magic Shard, gain 1 extra. Passive Catch and Release: you have 2 Conibear Trap tokens. As a Support action, flip a face-up Trap face-down to deal ATK 1 to a Clad/Legion (no limit while traps remain). Card effects can flip traps face-up/down.",
      imageUrl: "/assets/Character_Mia_delta/Illust/Mia_Delta_Portrait.webp"
    },
    {
      code: "CH_AMELIA_DELTA",
      name: "Amelia-\u0394",
      description:
        "Basic actions: +1 Move (1/turn), +1 MP (2/turn), -1 DMG (2/turn). All basic actions discard 1 card. CP actions: 1CP reduce damage by 1 (Reaction); 2CP +1 Move or +1 MP (Support); 4CP draw 1 (Support). Crack Skill Azur Skies (Support, 2CP, once/round): gain 1 Corruption, search your deck for 1 card and draw it, then shuffle your deck. Passive Catch and Release: place up to 8 Tsuchikumo on board intersections. Maneuver options: Deployment (place on connected intersection), Movement (move a Tsuchikumo 1 intersection), Harvest (pick up all Magic Stones on a space connected to a Tsuchikumo), Assault (attack ATK 1 in a space connected to a Tsuchikumo). Removed Tsuchikumo return to your board.",
      imageUrl: "/assets/Character_Amelia_delta/Illust/Amelia_Delta_Portrait.webp"
    }
  ];

  for (const ch of characters) {
    await prisma.character.upsert({
      where: { code: ch.code },
      update: ch,
      create: ch
    });
  }

  const chRosette = await prisma.character.findUniqueOrThrow({ where: { code: "CH_ROSETTE_DELTA" } });
  const chFlare = await prisma.character.findUniqueOrThrow({ where: { code: "CH_FLARE_DELTA" } });
  const chLuna = await prisma.character.findUniqueOrThrow({ where: { code: "CH_LUNA_DELTA" } });
  const chMia = await prisma.character.findUniqueOrThrow({ where: { code: "CH_MIA_DELTA" } });
  const chAmelia = await prisma.character.findUniqueOrThrow({ where: { code: "CH_AMELIA_DELTA" } });

  const rosetteCardCodes = [
    "HacKClaD_Rosette_Delta_Cards_Shoot",
    "HacKClaD_Rosette_Delta_Cards_Block",
    "HacKClaD_Rosette_Delta_Cards_Move",
    "HacKClaD_Rosette_Delta_Cards_VitalBlow",
    "HacKClaD_Rosette_Delta_Cards_Sweep",
    "HacKClaD_Rosette_Delta_Cards_Lunge",
    "HacKClaD_Rosette_Delta_Cards_Determination",
    "HacKClaD_Rosette_Delta_Cards_Challenge",
    "HacKClaD_Rosette_Delta_Cards_Riposte",
    "HacKClaD_Rosette_Delta_Cards_Impale",
    "HacKClaD_Rosette_Delta_Cards_Ratetsu",
    "HacKClaD_Rosette_Delta_Cards_Reversal",
    "HacKClaD_Rosette_Delta_Cards_Reap",
    "HacKClaD_Rosette_Delta_Cards_Carnage",
    "HacKClaD_Rosette_Delta_Cards_AuxillaryMana",
    "HacKClaD_Rosette_Delta_Cards_HundredDemons"
  ];

  const rosetteCards = await prisma.card.findMany({ where: { code: { in: rosetteCardCodes } } });
  const rosetteCardIdByCode = rosetteCards.reduce<Record<string, string>>((acc, c) => {
    acc[c.code] = c.id;
    return acc;
  }, {});

  const flareCardCodes = [
    "HacKClaD_Flare_Delta_Cards_Shoot",
    "HacKClaD_Flare_Delta_Cards_Block",
    "HacKClaD_Flare_Delta_Cards_Move",
    "HacKClaD_Flare_Delta_Cards_BastionBattery",
    "HacKClaD_Flare_Delta_Cards_Cannonade",
    "HacKClaD_Flare_Delta_Cards_ConcussionSalvo",
    "HacKClaD_Flare_Delta_Cards_GantryShield",
    "HacKClaD_Flare_Delta_Cards_SteadyPositions",
    "HacKClaD_Flare_Delta_Cards_RetaliatingBarrage",
    "HacKClaD_Flare_Delta_Cards_PinpointRocketCannon",
    "HacKClaD_Flare_Delta_Cards_LightpulsarPayload",
    "HacKClaD_Flare_Delta_Cards_LeadDownpour",
    "HacKClaD_Flare_Delta_Cards_Logistics",
    "HacKClaD_Flare_Delta_Cards_AuxillaryMana",
    "HacKClaD_Flare_Delta_Cards_MaelstromFormation",
    "HacKClaD_Flare_Delta_Cards_DesignatedFirePoint"
  ];

  const flareCards = await prisma.card.findMany({ where: { code: { in: flareCardCodes } } });
  const flareCardIdByCode = flareCards.reduce<Record<string, string>>((acc, c) => {
    acc[c.code] = c.id;
    return acc;
  }, {});

  const lunaCardCodes = [
    "HacKClaD_Luna_Delta_Cards_Shoot",
    "HacKClaD_Luna_Delta_Cards_Block",
    "HacKClaD_Luna_Delta_Cards_Move",
    "HacKClaD_Luna_Delta_Cards_RuinBlade",
    "HacKClaD_Luna_Delta_Cards_Thunderbolt",
    "HacKClaD_Luna_Delta_Cards_Condemn",
    "HacKClaD_Luna_Delta_Cards_Tsukuyomi",
    "HacKClaD_Luna_Delta_Cards_ChasingMelody",
    "HacKClaD_Luna_Delta_Cards_Thunderstep",
    "HacKClaD_Luna_Delta_Cards_EverchangingMagatama",
    "HacKClaD_Luna_Delta_Cards_HeavenlySwordOfGatheringClouds",
    "HacKClaD_Luna_Delta_Cards_Takemikazuchi",
    "HacKClaD_Luna_Delta_Cards_OctspanMirror",
    "HacKClaD_Luna_Delta_Cards_AuxillaryMana",
    "HacKClaD_Luna_Delta_Cards_SoaringHeights",
    "HacKClaD_Luna_Delta_Cards_Invocation"
  ];

  const lunaCards = await prisma.card.findMany({ where: { code: { in: lunaCardCodes } } });
  const lunaCardIdByCode = lunaCards.reduce<Record<string, string>>((acc, c) => {
    acc[c.code] = c.id;
    return acc;
  }, {});

  const miaCardCodes = [
    "HacKClaD_Mia_Delta_Cards_Shoot",
    "HacKClaD_Mia_Delta_Cards_Block",
    "HacKClaD_Mia_Delta_Cards_Move",
    "HacKClaD_Mia_Delta_Cards_Kunai",
    "HacKClaD_Mia_Delta_Cards_Kunai2",
    "HacKClaD_Mia_Delta_Cards_Shuriken",
    "HacKClaD_Mia_Delta_Cards_SummonTrap",
    "HacKClaD_Mia_Delta_Cards_IllusoryArts",
    "HacKClaD_Mia_Delta_Cards_Stealth",
    "HacKClaD_Mia_Delta_Cards_Mawashigeri",
    "HacKClaD_Mia_Delta_Cards_WeaponForaging",
    "HacKClaD_Mia_Delta_Cards_Heelstomp",
    "HacKClaD_Mia_Delta_Cards_Substitute",
    "HacKClaD_Mia_Delta_Cards_ConvergenceSeal",
    "HacKClaD_Mia_Delta_Cards_AuxillaryMana",
    "HacKClaD_Mia_Delta_Cards_Tsujigiri"
  ];

  const miaCards = await prisma.card.findMany({ where: { code: { in: miaCardCodes } } });
  const miaCardIdByCode = miaCards.reduce<Record<string, string>>((acc, c) => {
    acc[c.code] = c.id;
    return acc;
  }, {});

  const ameliaCardCodes = [
    "HacKClaD_Amelia_Delta_Cards_Shoot",
    "HacKClaD_Amelia_Delta_Cards_Block",
    "HacKClaD_Amelia_Delta_Cards_Move",
    "HacKClaD_Amelia_Delta_Cards_SteelstringTransmutation",
    "HacKClaD_Amelia_Delta_Cards_Tsuchikumo",
    "HacKClaD_Amelia_Delta_Cards_ActiviationProtocol",
    "HacKClaD_Amelia_Delta_Cards_Investigate",
    "HacKClaD_Amelia_Delta_Cards_Experiment",
    "HacKClaD_Amelia_Delta_Cards_ElectromagneticCannon",
    "HacKClaD_Amelia_Delta_Cards_AuxillaryMana",
    "HacKClaD_Amelia_Delta_Cards_DefenseNetwork",
    "HacKClaD_Amelia_Delta_Cards_GatlingStorm",
    "HacKClaD_Amelia_Delta_Cards_MultithreadedOperations",
    "HacKClaD_Amelia_Delta_Cards_DeepDelve",
    "HacKClaD_Amelia_Delta_Cards_Reboot",
    "HacKClaD_Amelia_Delta_Cards_Transfiguration"
  ];

  const ameliaCards = await prisma.card.findMany({ where: { code: { in: ameliaCardCodes } } });
  const ameliaCardIdByCode = ameliaCards.reduce<Record<string, string>>((acc, c) => {
    acc[c.code] = c.id;
    return acc;
  }, {});

  // Character pools
  const pool = [
    // Rosette-? pool: 8 standard starters + 8 enhanced options
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Shoot"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Block"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Move"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_VitalBlow"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Sweep"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Lunge"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Determination"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Challenge"], isStarter: true },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Riposte"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Impale"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Ratetsu"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Reversal"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Reap"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_Carnage"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_AuxillaryMana"], isStarter: false },
    { characterId: chRosette.id, cardId: rosetteCardIdByCode["HacKClaD_Rosette_Delta_Cards_HundredDemons"], isStarter: false },

    // Flare-? pool: 8 standard starters + 8 enhanced options
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_Shoot"], isStarter: true },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_Block"], isStarter: true },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_Move"], isStarter: true },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_BastionBattery"], isStarter: true },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_Cannonade"], isStarter: true },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_ConcussionSalvo"], isStarter: true },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_GantryShield"], isStarter: true },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_SteadyPositions"], isStarter: true },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_RetaliatingBarrage"], isStarter: false },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_PinpointRocketCannon"], isStarter: false },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_LightpulsarPayload"], isStarter: false },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_LeadDownpour"], isStarter: false },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_Logistics"], isStarter: false },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_AuxillaryMana"], isStarter: false },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_MaelstromFormation"], isStarter: false },
    { characterId: chFlare.id, cardId: flareCardIdByCode["HacKClaD_Flare_Delta_Cards_DesignatedFirePoint"], isStarter: false },

    // Luna-? pool: 8 standard starters + 8 enhanced options
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_Shoot"], isStarter: true },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_Block"], isStarter: true },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_Move"], isStarter: true },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_RuinBlade"], isStarter: true },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_Thunderbolt"], isStarter: true },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_Condemn"], isStarter: true },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_Tsukuyomi"], isStarter: true },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_ChasingMelody"], isStarter: true },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_Thunderstep"], isStarter: false },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_EverchangingMagatama"], isStarter: false },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_HeavenlySwordOfGatheringClouds"], isStarter: false },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_Takemikazuchi"], isStarter: false },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_OctspanMirror"], isStarter: false },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_AuxillaryMana"], isStarter: false },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_SoaringHeights"], isStarter: false },
    { characterId: chLuna.id, cardId: lunaCardIdByCode["HacKClaD_Luna_Delta_Cards_Invocation"], isStarter: false },

    // Mia-Δ pool: 8 standard starters (including 2x Kunai) + 8 enhanced options
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Shoot"], isStarter: true },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Block"], isStarter: true },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Move"], isStarter: true },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Kunai"], isStarter: true },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Kunai2"], isStarter: true },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Shuriken"], isStarter: true },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_SummonTrap"], isStarter: true },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_IllusoryArts"], isStarter: true },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Stealth"], isStarter: false },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Mawashigeri"], isStarter: false },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_WeaponForaging"], isStarter: false },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Heelstomp"], isStarter: false },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Substitute"], isStarter: false },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_ConvergenceSeal"], isStarter: false },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_AuxillaryMana"], isStarter: false },
    { characterId: chMia.id, cardId: miaCardIdByCode["HacKClaD_Mia_Delta_Cards_Tsujigiri"], isStarter: false },

    // Amelia-Δ pool: 8 standard starters + 8 enhanced options
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_Shoot"], isStarter: true },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_Block"], isStarter: true },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_Move"], isStarter: true },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_SteelstringTransmutation"], isStarter: true },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_Tsuchikumo"], isStarter: true },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_ActiviationProtocol"], isStarter: true },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_Investigate"], isStarter: true },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_Experiment"], isStarter: true },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_ElectromagneticCannon"], isStarter: false },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_AuxillaryMana"], isStarter: false },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_DefenseNetwork"], isStarter: false },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_GatlingStorm"], isStarter: false },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_MultithreadedOperations"], isStarter: false },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_DeepDelve"], isStarter: false },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_Reboot"], isStarter: false },
    { characterId: chAmelia.id, cardId: ameliaCardIdByCode["HacKClaD_Amelia_Delta_Cards_Transfiguration"], isStarter: false }
  ];


  for (const p of pool) {
    await prisma.characterCard.upsert({
      where: { characterId_cardId: { characterId: p.characterId, cardId: p.cardId } },
      update: { isStarter: p.isStarter },
      create: p
    });
  }

  console.log("Seed completed (Rosette-\u0394, Flare-\u0394, Luna-\u0394, Mia-\u0394, Amelia-\u0394 added).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
