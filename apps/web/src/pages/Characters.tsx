import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { httpGet, httpPost } from "../api/http";
import { Container } from "../components/Container";
import { Card } from "../components/Card";
import { Button } from "../components/ui";

type Character = {
  id: string;
  code: string;
  name: string;
  description: string;
  imageUrl?: string | null;
};

type CardDef = {
  id: string;
  code: string;
  name: string;
  description: string;
  costMP: number;
  tags?: string | null;
  isStarter: boolean;
};

type CharacterInfo = {
  summary: string;
  basicActions: string;
  cpActions: string;
  crackSkill: string;
  passive: string;
};

type MeResp = {
  user: {
    id: string;
    username: string;
    nickname: string;
    selectedCharacterId?: string | null;
    selectedCharacter?: {
      id: string;
      code: string;
      name: string;
      description: string;
      imageUrl?: string | null;
    } | null;
  };
};

type CardsResp = { cards: CardDef[] };
type CharactersResp = { characters: Character[] };
type RangeCoord = { x: number; y: number };

// Static image lookup for character portraits
const CHAR_IMAGES = import.meta.glob("../assets/Character_*/Illust/*", {
  eager: true,
  as: "url"
}) as Record<string, string>;

// Static image lookup for cards
const CARD_IMAGES = import.meta.glob("../assets/Character_*/{Standard,Enhanced}/*", {
  eager: true,
  as: "url"
}) as Record<string, string>;

const TYPE_ICON_IMAGES = import.meta.glob("../assets/type_icon/*.webp", {
  eager: true,
  as: "url"
}) as Record<string, string>;

const TYPE_ICON_MAP: Record<"attack" | "reaction" | "support", string> = {
  attack: TYPE_ICON_IMAGES["../assets/type_icon/22px-HacKClaD_Attack_Icon.webp"],
  reaction: TYPE_ICON_IMAGES["../assets/type_icon/22px-HacKClaD_Reaction_Icon.webp"],
  support: TYPE_ICON_IMAGES["../assets/type_icon/22px-HacKClaD_Support_Icon.webp"]
};

const CARD_TEXT_KO: Record<string, string> = {
  HacKClaD_Rosette_Delta_Cards_Shoot: "사거리 내 최대 2개 대상에게 피해를 줍니다.",
  HacKClaD_Rosette_Delta_Cards_Block: "들어오는 피해를 2 줄입니다.",
  HacKClaD_Rosette_Delta_Cards_Move: "1칸 이동합니다.",
  HacKClaD_Rosette_Delta_Cards_VitalBlow: "정면에서 공격했다면, 공격 후 클래드를 밀쳐냅니다.",
  HacKClaD_Rosette_Delta_Cards_Sweep: "버린 패에 있을 때: 크랙 스킬 사용 시 이 카드를 손으로 되돌립니다.",
  HacKClaD_Rosette_Delta_Cards_Lunge: "부상 게이지를 1 올립니다.",
  HacKClaD_Rosette_Delta_Cards_Determination: "Unyielding을 발동합니다.",
  HacKClaD_Rosette_Delta_Cards_Challenge: "인접 시에만 사용. 클래드의 앞면이 나를 향하도록 돌립니다.",
  HacKClaD_Rosette_Delta_Cards_Riposte: "정면에서 공격 시: ATK +1, 내 덱 맨 위 카드를 버립니다.",
  HacKClaD_Rosette_Delta_Cards_Impale: "공격 후 CP 1을 지불해 클래드의 앞면이 나를 향하게 돌릴 수 있습니다.",
  HacKClaD_Rosette_Delta_Cards_Ratetsu: "부상 게이지를 1 올립니다.",
  HacKClaD_Rosette_Delta_Cards_Reversal: "부상 ≥ 5라면 ATK +1, 공격 후 클래드를 밀쳐냅니다.",
  HacKClaD_Rosette_Delta_Cards_Reap: "최대 2개 대상에게 피해를 줍니다.",
  HacKClaD_Rosette_Delta_Cards_Carnage: "인접 시에만 사용. ATK 3으로 클래드를 공격하고 Unyielding을 발동합니다.",
  HacKClaD_Rosette_Delta_Cards_AuxillaryMana: "MP를 2 얻습니다. 추가로 MP 1을 지불해 Unyielding을 발동할 수 있습니다.",
  HacKClaD_Rosette_Delta_Cards_HundredDemons:
    "덱 맨 위 카드를 버리고, 그 카드를 즉시 사용할 수 있습니다. 이번 턴 크랙 스킬을 한 번 더 사용할 수 있습니다.",
  HacKClaD_Flare_Delta_Cards_Shoot: "사거리 내 최대 2개 대상에게 피해를 줍니다.",
  HacKClaD_Flare_Delta_Cards_Block: "들어오는 피해를 2 줄입니다.",
  HacKClaD_Flare_Delta_Cards_Move: "1칸 이동합니다.",
  HacKClaD_Flare_Delta_Cards_BastionBattery: "이 카드를 \"-1 DMG\" 기본 행동으로 버렸다면 Intercept 1을 수행합니다.",
  HacKClaD_Flare_Delta_Cards_Cannonade:
    "이번 턴 이동하지 않았다면 ATK +1을 선택할 수 있습니다. 그렇게 했다면 이번 턴 나머지 동안 이동할 수 없습니다.",
  HacKClaD_Flare_Delta_Cards_ConcussionSalvo: "이번 라운드 동안 클래드는 이동하거나 밀려나지 않습니다. (방향 전환은 가능합니다.)",
  HacKClaD_Flare_Delta_Cards_GantryShield: "Intercept 2를 수행합니다. 들어오는 공격 피해를 2 줄입니다.",
  HacKClaD_Flare_Delta_Cards_SteadyPositions:
    "이번 라운드 다음에 받는 피해를 2 줄입니다. 이번 턴 이동하지 않았다면 CP 1을 얻고 즉시 턴을 종료합니다.",
  HacKClaD_Flare_Delta_Cards_RetaliatingBarrage: "이 카드를 \"-1 DMG\" 기본 행동으로 버렸다면 Intercept 3을 수행합니다.",
  HacKClaD_Flare_Delta_Cards_PinpointRocketCannon: "CP 게이지를 1 올립니다.",
  HacKClaD_Flare_Delta_Cards_LightpulsarPayload: "추가 비용: 원하는 만큼 CP를 지불합니다. X는 지불한 CP입니다.",
  HacKClaD_Flare_Delta_Cards_LeadDownpour:
    "추가로 CP 3을 지불할 수 있습니다. 그렇게 했다면 이 카드의 ATK가 1 증가합니다.",
  HacKClaD_Flare_Delta_Cards_Logistics:
    "서로 다른 옵션 2개 선택: 들어오는 피해 2 감소 / 카드 1장 드로우 / 버린 패 1장을 손으로 되돌리기.",
  HacKClaD_Flare_Delta_Cards_AuxillaryMana:
    "MP를 2 얻습니다. 이 카드를 \"-1 DMG\" 기본 행동으로 버렸다면 Intercept 2를 수행합니다.",
  HacKClaD_Flare_Delta_Cards_MaelstromFormation:
    "이 카드를 \"-1 DMG\" 기본 행동으로 버릴 때 CP 게이지를 1 올립니다.\n버린 패에 있을 때: CP를 쓰지 않고 리액션(기본 행동 포함)을 수행하면 CP 게이지를 1 올립니다.",
  HacKClaD_Flare_Delta_Cards_DesignatedFirePoint:
    "이번 턴 남은 동안 이동할 수 없습니다. 당신의 다음 공격/공격 마법 카드는 ATK +1, 사거리 무시 효과를 얻습니다.",
  HacKClaD_Luna_Delta_Cards_Shoot: "사거리 내 최대 2개 대상에게 피해를 줍니다.",
  HacKClaD_Luna_Delta_Cards_Block: "들어오는 피해를 2 줄입니다.",
  HacKClaD_Luna_Delta_Cards_Move: "1칸 이동합니다.",
  HacKClaD_Luna_Delta_Cards_RuinBlade: "클래드를 대상으로 한다면 ATK +1.",
  HacKClaD_Luna_Delta_Cards_Thunderbolt: "이번 턴에 공격/공격 마법 카드를 사용했다면 ATK +1.",
  HacKClaD_Luna_Delta_Cards_Condemn: "클래드 덱 맨 위를 봅니다(공개 선택). 전압 1을 공개했거나 덱이 비어있다면 ATK +1.",
  HacKClaD_Luna_Delta_Cards_Tsukuyomi: "MP를 2 얻습니다. 점괘를 수행합니다.",
  HacKClaD_Luna_Delta_Cards_ChasingMelody: "이번 턴 다음 공격/공격 마법 카드가 다중타 2회를 얻습니다.",
  HacKClaD_Luna_Delta_Cards_Thunderstep:
    "이 공격으로 레기온을 처치했다면 그 칸으로 이동할 수 있습니다(여러 개면 하나 선택).",
  HacKClaD_Luna_Delta_Cards_EverchangingMagatama:
    "클래드 덱 맨 위를 봅니다(공개 선택). 전압 1을 공개했거나 덱이 비어있다면 ATK +1.",
  HacKClaD_Luna_Delta_Cards_HeavenlySwordOfGatheringClouds: "이 공격은 클래드만 대상으로 합니다.",
  HacKClaD_Luna_Delta_Cards_Takemikazuchi: "X는 이번 턴 사용한 지원/지원 마법 카드 수입니다(기본 행동 제외).",
  HacKClaD_Luna_Delta_Cards_OctspanMirror: "클래드의 방향을 반대로 뒤집습니다.",
  HacKClaD_Luna_Delta_Cards_AuxillaryMana: "MP를 2 얻습니다. 추가로 MP 1을 지불해 점괘를 수행할 수 있습니다.",
  HacKClaD_Luna_Delta_Cards_SoaringHeights: "점괘를 수행합니다. 클래드 인접한 빈 칸으로 이동할 수 있습니다.",
  HacKClaD_Luna_Delta_Cards_Invocation:
    "버린 패에서 지원/지원 마법 카드 1장을 손으로 되돌립니다. 이번 턴 다음 공격/공격 마법 카드가 ATK +1을 얻습니다.",
  HacKClaD_Mia_Delta_Cards_Shoot: "사거리 내 최대 2개 대상에게 피해를 줍니다.",
  HacKClaD_Mia_Delta_Cards_Block: "들어오는 피해를 2 줄입니다.",
  HacKClaD_Mia_Delta_Cards_Move: "1칸 이동합니다.",
  HacKClaD_Mia_Delta_Cards_Kunai: "추가 효과 없음.",
  HacKClaD_Mia_Delta_Cards_Kunai2: "추가 효과 없음.",
  HacKClaD_Mia_Delta_Cards_Shuriken:
    "공격 후 이 카드를 턴 카드 위에 뒷면으로 버립니다. 턴 카드를 드로우할 때 두 장을 함께 드로우합니다.",
  HacKClaD_Mia_Delta_Cards_SummonTrap: "뒷면인 코니베어 트랩 1장을 앞면으로 뒤집습니다.",
  HacKClaD_Mia_Delta_Cards_IllusoryArts: "클래드와 인접할 때만 사용. 클래드의 등(뒤쪽)이 나를 향하도록 돌립니다.",
  HacKClaD_Mia_Delta_Cards_Stealth:
    "클래드의 뒤에서 공격했다면 카드 1장을 드로우합니다. 이 효과는 라운드당 1회만 발동합니다.",
  HacKClaD_Mia_Delta_Cards_Mawashigeri: "클래드의 뒤에서 공격했다면 뒷면인 코니베어 트랩 1장을 앞면으로 뒤집습니다.",
  HacKClaD_Mia_Delta_Cards_WeaponForaging: "버린 패의 쿠나이 전부를 손으로 되돌립니다.",
  HacKClaD_Mia_Delta_Cards_Heelstomp:
    "추가 비용: 손의 쿠나이 1장을 버릴 수 있습니다. 그렇게 했다면 이 카드 ATK +1, 공격 후 클래드를 밀쳐냅니다.",
  HacKClaD_Mia_Delta_Cards_Substitute:
    "추가 비용: 앞면인 코니베어 트랩 1장을 뒷면으로 뒤집습니다. 비어있는 칸 1개를 선택해 그 칸으로 이동합니다. 이동 1칸으로 취급합니다.",
  HacKClaD_Mia_Delta_Cards_ConvergenceSeal:
    "이 카드가 버린 패로 갈 때, 이번 턴 클래드/레기온에게 총 4 이상 피해를 줬다면 클래드에게 3 피해를 줍니다. 이 효과는 턴당 1회만 발동합니다.",
  HacKClaD_Mia_Delta_Cards_AuxillaryMana: "MP를 2 얻습니다. MP 1을 지불해 뒷면인 코니베어 트랩 1장을 앞면으로 뒤집을 수 있습니다.",
  HacKClaD_Mia_Delta_Cards_Tsujigiri:
    "2칸 이동합니다. 다른 마녀/클래드/레기온을 통과할 수 있습니다. 지나간 칸의 클래드/레기온마다 2 피해를 주고, 지나간 마력 파편을 획득합니다.",
  HacKClaD_Amelia_Delta_Cards_Shoot: "사거리 내 최대 2개 대상에게 피해를 줍니다.",
  HacKClaD_Amelia_Delta_Cards_Block: "들어오는 피해를 2 줄입니다.",
  HacKClaD_Amelia_Delta_Cards_Move: "기동: 이동/수확/강습 중 하나를 수행합니다.",
  HacKClaD_Amelia_Delta_Cards_SteelstringTransmutation: "버린 패 카드 3장마다 이 카드 ATK +1.",
  HacKClaD_Amelia_Delta_Cards_Tsuchikumo: "기동: 전개를 수행합니다. 최대 1칸 이동합니다.",
  HacKClaD_Amelia_Delta_Cards_ActiviationProtocol:
    "공격 후 이 카드를 턴 카드 위에 뒷면으로 버립니다. 턴 카드를 드로우할 때 두 장을 함께 드로우합니다.",
  HacKClaD_Amelia_Delta_Cards_Investigate: "기동: 이동을 수행할 수 있습니다. 덱 맨 위 카드를 확인하고 버릴 수 있습니다.",
  HacKClaD_Amelia_Delta_Cards_Experiment:
    "추가 비용: 보드의 츠치구모 1개를 제거합니다. 강화 카드 1장을 무작위로 버린 패에 추가합니다(덱 최대치 증가).",
  HacKClaD_Amelia_Delta_Cards_ElectromagneticCannon: "X는 버린 패 카드 수 -3 (최소 0)입니다.",
  HacKClaD_Amelia_Delta_Cards_AuxillaryMana:
    "MP를 2 얻습니다. MP 1을 지불해 기동: 전개/이동/수확/강습 중 하나를 수행할 수 있습니다.",
  HacKClaD_Amelia_Delta_Cards_DefenseNetwork:
    "기동: 전개를 수행합니다.\n버린 패에 있을 때: 내 칸에 영향 주는 츠치구모 수 X만큼 들어오는 피해를 감소합니다.",
  HacKClaD_Amelia_Delta_Cards_GatlingStorm:
    "기동: 강습을 2회 수행합니다. 츠치구모가 5개 이상 배치돼 있다면 강습을 1회 더 수행합니다.",
  HacKClaD_Amelia_Delta_Cards_MultithreadedOperations:
    "이번 턴 츠치구모의 클래드/레기온 피해 +1(중첩).\n버린 패에 있을 때: 턴당 1회, 기동: 이동/수확/강습 중 하나를 수행할 수 있습니다.",
  HacKClaD_Amelia_Delta_Cards_DeepDelve: "CP 게이지를 1 올립니다. 덱에 카드가 5장 이상이라면 카드 1장을 드로우합니다.",
  HacKClaD_Amelia_Delta_Cards_Reboot: "버린 패의 카드 1장을 선택해 손으로 되돌립니다.",
  HacKClaD_Amelia_Delta_Cards_Transfiguration:
    "턴 종료까지 덱을 다시 섞을 수 없습니다. 보드에서 츠치구모를 최대 X개 제거합니다(X = 현재 덱의 카드 수). 제거한 수만큼 카드 드로우."
};

const CHARACTER_INFO_KO: Record<string, CharacterInfo> = {
  CH_ROSETTE_DELTA: {
    summary: "불굴의 의지로 정면 승부를 거는 전투형 마녀.",
    basicActions: "이동 +1 (턴당 2회), MP +1 (턴당 2회), 피해 -1 (턴당 1회). 모든 기본 액션은 카드 1장 버림.",
    cpActions: "1CP: 피해 -1 (리액션) · 2CP: 이동 +1 또는 MP +1 (지원) · 4CP: 카드 1장 드로우 (지원).",
    crackSkill:
      "아오마가카기 (리액션, 1CP, 라운드당 1회): 오염 1 획득, 0~1칸 이동, 이번 턴 공격/공격 마법 카드 ATK +1.",
    passive:
      "불굴의 의지: 스킬 사용 시 Unyielding 발동. 라운드 종료까지 부상으로 VP 파편이 떨어지지 않습니다(다른 부상 효과는 적용)."
  },
  CH_FLARE_DELTA: {
    summary: "요격에 특화된 포격형 마녀.",
    basicActions: "이동 +1 (턴당 1회), MP +1 (턴당 2회), 피해 -1 (턴당 2회). 모든 기본 액션은 카드 1장 버림.",
    cpActions: "1CP: 피해 -1 (리액션) · 2CP: 이동 +1 또는 MP +1 (지원) · 4CP: 카드 1장 드로우 (지원).",
    crackSkill: "Hope's Beacon (리액션, 1CP, 라운드당 1회): 오염 1 획득, Intercept 3, 들어오는 피해 -2.",
    passive:
      "Counter-battery: Intercept X 수행 시 공격한 클래드/레기온에게 ATK X 피해를 줍니다(클래드 이동/막을 수 없는 소환에는 발동 안 함. 이 피해로 레기온이 파괴되면 해당 공격은 발생하지 않음)."
  },
  CH_LUNA_DELTA: {
    summary: "점괘와 마법으로 흐름을 바꾸는 마녀.",
    basicActions: "이동 +1 (턴당 1회), MP +1 (턴당 2회), 피해 -1 (턴당 2회). 모든 기본 액션은 카드 1장 버림.",
    cpActions: "1CP: 피해 -1 (리액션) · 2CP: 이동 +1 또는 MP +1 (지원) · 4CP: 카드 1장 드로우 (지원).",
    crackSkill: "Innveration Kagura (지원, 1CP, 라운드당 1회): 오염 1 획득, MP 5 회복.",
    passive: "Scrying Futures: 스킬 사용 시 점괘 수행(클래드 덱 맨 위를 봄, 비어있다면 MP +1)."
  },
  CH_MIA_DELTA: {
    summary: "민첩한 기동과 트랩 운용에 특화.",
    basicActions: "이동 +1 (턴당 3회), MP +1 (턴당 1회), 피해 -1 (턴당 1회). 모든 기본 액션은 카드 1장 버림.",
    cpActions: "1CP: 피해 -1 (리액션) · 2CP: 이동 +1 또는 MP +1 (지원) · 4CP: 카드 1장 드로우 (지원).",
    crackSkill:
      "Lykos Shinobi (지원, 1CP, 라운드당 1회; 이번 라운드에 클래드/레기온에 3 이상 피해를 줬을 때만 사용 가능): 오염 1 획득, 라운드 종료까지 마력 파편을 얻을 때마다 1개 추가 획득.",
    passive:
      "Catch and Release: 코니베어 트랩 토큰 2개를 보유합니다. 지원 행동으로 앞면 트랩을 뒷면으로 뒤집어 클래드/레기온에 ATK 1을 줄 수 있습니다(트랩이 남아 있는 한 제한 없음). 카드 효과로 트랩을 앞/뒷면으로 뒤집을 수 있습니다."
  },
  CH_AMELIA_DELTA: {
    summary: "츠치구모와 기동을 조합하는 전략형 마녀.",
    basicActions: "이동 +1 (턴당 1회), MP +1 (턴당 2회), 피해 -1 (턴당 2회). 모든 기본 액션은 카드 1장 버림.",
    cpActions: "1CP: 피해 -1 (리액션) · 2CP: 이동 +1 또는 MP +1 (지원) · 4CP: 카드 1장 드로우 (지원).",
    crackSkill: "Azur Skies (지원, 2CP, 라운드당 1회): 오염 1 획득, 덱에서 카드 1장을 찾아 손으로 가져온 뒤 덱을 섞습니다.",
    passive:
      "Catch and Release: 교차점에 츠치구모를 최대 8개까지 배치합니다. 기동 옵션: 전개(연결된 교차점에 배치), 이동(츠치구모 1개를 교차점 1칸 이동), 수확(츠치구모와 연결된 칸의 마력석 전부 획득), 강습(츠치구모와 연결된 칸에 ATK 1 공격). 제거된 츠치구모는 보드로 되돌아옵니다."
  }
};

function findCharImage(path?: string | null) {
  if (!path) return "";
  const filename = path.split("/").pop();
  if (!filename) return "";
  const key = Object.keys(CHAR_IMAGES).find((k) => k.endsWith(`/${filename}`));
  return key ? CHAR_IMAGES[key] : "";
}

function findCardImage(code: string) {
  const match = Object.entries(CARD_IMAGES).find(
    ([k]) => k.endsWith(`/${code}.webp`) || k.endsWith(`/${code}.png`) || k.endsWith(`/${code}.jpg`)
  );
  return match ? (match[1] as string) : "";
}

function typeIconUrl(tags?: string | null) {
  const normalized = (tags ?? "").toLowerCase();
  if (normalized.includes("reaction")) return TYPE_ICON_MAP.reaction;
  if (normalized.includes("support")) return TYPE_ICON_MAP.support;
  if (normalized.includes("attack")) return TYPE_ICON_MAP.attack;
  return "";
}

function extractRange(text: string): { cleaned: string; coords: RangeCoord[] | null } {
  const rangeRegex = /(사거리|Range)\s*(\([-?\d\s,]+\))+(\s*·\s*)?/;
  const coords: RangeCoord[] = [];
  const cleaned = text.replace(rangeRegex, "").replace(/\s*·\s*$/, "").trim();
  const matches = text.matchAll(/\((-?\d+),\s*(-?\d+)\)/g);
  for (const match of matches) {
    coords.push({ x: Number(match[1]), y: Number(match[2]) });
  }
  return { cleaned, coords: coords.length > 0 ? coords : null };
}

function rangeIcon(coords: RangeCoord[], size: "sm" | "md" = "sm") {
  const cell = size === "sm" ? 4 : 6;
  const gap = 2;
  const box = cell * 5 + gap * 4;
  const active = new Set(coords.map((c) => `${c.x},${c.y}`));
  const cells: ReactElement[] = [];
  for (let y = 2; y >= -2; y -= 1) {
    for (let x = -2; x <= 2; x += 1) {
      const isCenter = x === 0 && y === 0;
      const isActive = active.has(`${x},${y}`);
      cells.push(
        <div
          key={`${x},${y}`}
          className={`rounded-[1px] ${isActive ? "bg-red-500" : isCenter ? "bg-yellow-400" : "bg-slate-600/60"}`}
          style={{ width: cell, height: cell }}
        />
      );
    }
  }
  return (
    <div
      className="grid rounded-md bg-slate-800/80 p-1"
      style={{
        gridTemplateColumns: `repeat(5, ${cell}px)`,
        gridTemplateRows: `repeat(5, ${cell}px)`,
        gap,
        width: box + 8,
        height: box + 8
      }}
      aria-label="사거리"
    >
      {cells}
    </div>
  );
}

function localizedText(card: CardDef) {
  return CARD_TEXT_KO[card.code] ?? card.description;
}

function renderCardDescription(card: CardDef, text: string, size: "sm" | "lg" = "sm") {
  const typeIcon = typeIconUrl(card.tags ?? "");
  const { coords } = extractRange(card.description ?? "");
  const { coords: koCoords } = extractRange(text);
  const finalCoords = coords ?? koCoords;
  const isLarge = size === "lg";
  const iconClass = isLarge ? "h-6 w-6" : "h-5 w-5";
  const textClass = isLarge ? "text-sm sm:text-base" : "text-xs sm:text-sm";

  return (
    <div className={isLarge ? "space-y-3" : "space-y-2"}>
      <div className="flex flex-wrap items-center gap-2">
        {typeIcon ? <img src={typeIcon} alt="카드 타입" className={iconClass} /> : null}
        {finalCoords ? rangeIcon(finalCoords, isLarge ? "md" : "sm") : null}
      </div>
      <div className={`${textClass} whitespace-pre-line text-text-sub`}>{text}</div>
    </div>
  );
}

export default function Characters() {
  const nav = useNavigate();
  const token = useMemo(() => localStorage.getItem("token") ?? "", []);
  const [me, setMe] = useState<MeResp | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inspectCard, setInspectCard] = useState<CardDef | null>(null);

  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }

    async function loadInitial() {
      setLoading(true);
      setError("");

      try {
        const [meResp, charResp] = await Promise.all([httpGet<MeResp>("/api/me", token), httpGet<CharactersResp>("/api/characters", token)]);
        const list = charResp.characters ?? [];
        const initialId = meResp.user.selectedCharacterId ?? list[0]?.id ?? null;
        setMe(meResp);
        setCharacters(list);
        setActiveId(initialId);
        if (initialId) {
          const cardsResp = await httpGet<CardsResp>(`/api/cards?characterId=${initialId}`, token);
          setCards(cardsResp.cards ?? []);
        } else {
          setCards([]);
        }
      } catch (e: any) {
        setError(e?.message ?? "캐릭터 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, [nav, token]);

  async function loadCards(characterId: string) {
    setLoading(true);
    try {
      const cardsResp = await httpGet<CardsResp>(`/api/cards?characterId=${characterId}`, token);
      setCards(cardsResp.cards ?? []);
    } catch (e: any) {
      setError(e?.message ?? "카드 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function selectCharacter() {
    if (!activeId) return;
    setSaving(true);
    setError("");
    try {
      await httpPost("/api/characters/select", { characterId: activeId }, token);
      setMe((prev) => (prev ? { ...prev, user: { ...prev.user, selectedCharacterId: activeId } } : prev));
    } catch (e: any) {
      setError(e?.message ?? "선택을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const activeCharacter = characters.find((c) => c.id === activeId) ?? null;
  const activeInfo = activeCharacter ? CHARACTER_INFO_KO[activeCharacter.code] : null;
  const activeImage = activeCharacter ? findCharImage(activeCharacter.imageUrl ?? undefined) || activeCharacter.imageUrl || "" : "";
  const starterCards = cards.filter((c) => c.isStarter);
  const enhancedCards = cards.filter((c) => !c.isStarter);
  const isSelected = !!activeCharacter && me?.user.selectedCharacterId === activeCharacter.id;

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-red-300">{error}</div>
      </div>
    );
  }

  if (loading && characters.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/70">로딩 중...</div>
      </div>
    );
  }

  return (
    <Container maxWidth="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-text-sub">캐릭터</div>
          <div className="text-2xl font-extrabold">캐릭터 선택</div>
        </div>
        <div className="w-32">
          <Button variant="ghost" onClick={() => nav("/lobby")}>로비로</Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <div className="text-sm font-semibold">캐릭터 목록</div>
          <div className="mt-3 space-y-2">
            {characters.map((c) => {
              const info = CHARACTER_INFO_KO[c.code];
              const summary = info?.summary ?? c.description;
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    isActive ? "border-neon-purple bg-bg1/60" : "border-line bg-bg1/30 hover:bg-bg1/50"
                  }`}
                  onClick={() => {
                    setActiveId(c.id);
                    loadCards(c.id);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{c.name}</div>
                    {me?.user.selectedCharacterId === c.id ? (
                      <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[10px] text-amber-200">
                        선택됨
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-text-sub line-clamp-2">{summary}</div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-text-sub">선택 캐릭터</div>
                <div className="text-xl font-bold">{activeCharacter?.name ?? "캐릭터를 선택하세요"}</div>
              </div>
              <div className="w-40">
                <Button onClick={selectCharacter} disabled={!activeCharacter || saving || isSelected}>
                  {isSelected ? "선택됨" : saving ? "저장 중..." : "선택하기"}
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
              <div className="flex justify-center">
                <div className="h-64 w-44 rounded-2xl border border-line bg-bg1/40 flex items-center justify-center">
                  {activeImage ? (
                    <img src={activeImage} alt={activeCharacter?.name ?? "Character"} className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-xs text-text-sub">이미지 없음</div>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {activeInfo ? (
                  <>
                    <div>
                      <div className="text-xs font-semibold text-text-sub">기본 액션</div>
                      <div className="mt-1 text-sm whitespace-pre-line text-text-main">{activeInfo.basicActions}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-sub">CP 액션</div>
                      <div className="mt-1 text-sm whitespace-pre-line text-text-main">{activeInfo.cpActions}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-sub">크랙 스킬</div>
                      <div className="mt-1 text-sm whitespace-pre-line text-text-main">{activeInfo.crackSkill}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-sub">패시브</div>
                      <div className="mt-1 text-sm whitespace-pre-line text-text-main">{activeInfo.passive}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-text-sub whitespace-pre-line">{activeCharacter?.description ?? ""}</div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">기본 카드</div>
              <div className="text-xs text-text-sub">클릭하면 상세 정보</div>
            </div>
            <div className="mt-4 grid gap-3">
              {starterCards.length === 0 ? (
                <div className="text-sm text-text-sub">표시할 카드가 없습니다.</div>
              ) : (
                starterCards.map((card) => {
                  const text = localizedText(card);
                  const image = findCardImage(card.code);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      className="w-full rounded-2xl border border-line/60 bg-bg1/30 p-3 text-left transition hover:bg-bg1/50"
                      onClick={() => setInspectCard(card)}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="h-32 w-24 shrink-0 rounded-xl border border-line bg-bg1/40 flex items-center justify-center">
                          {image ? (
                            <img src={image} alt={card.name} className="h-full w-full rounded-xl object-cover" />
                          ) : (
                            <div className="text-[10px] text-text-sub">이미지 없음</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold">{card.name}</div>
                            <div className="rounded-md border border-line bg-bg1/40 px-2 py-0.5 text-[11px] text-text-sub">
                              MP {card.costMP}
                            </div>
                          </div>
                          {renderCardDescription(card, text, "sm")}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">강화 카드</div>
              <div className="text-xs text-text-sub">클릭하면 상세 정보</div>
            </div>
            <div className="mt-4 grid gap-3">
              {enhancedCards.length === 0 ? (
                <div className="text-sm text-text-sub">표시할 카드가 없습니다.</div>
              ) : (
                enhancedCards.map((card) => {
                  const text = localizedText(card);
                  const image = findCardImage(card.code);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      className="w-full rounded-2xl border border-line/60 bg-bg1/30 p-3 text-left transition hover:bg-bg1/50"
                      onClick={() => setInspectCard(card)}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="h-32 w-24 shrink-0 rounded-xl border border-line bg-bg1/40 flex items-center justify-center">
                          {image ? (
                            <img src={image} alt={card.name} className="h-full w-full rounded-xl object-cover" />
                          ) : (
                            <div className="text-[10px] text-text-sub">이미지 없음</div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold">{card.name}</div>
                            <div className="rounded-md border border-line bg-bg1/40 px-2 py-0.5 text-[11px] text-text-sub">
                              MP {card.costMP}
                            </div>
                          </div>
                          {renderCardDescription(card, text, "sm")}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {inspectCard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[640px] rounded-2xl border border-line bg-panel/95 p-5 shadow-neon">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-text-sub">카드 상세</div>
                <div className="text-lg font-extrabold">{inspectCard.name}</div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-line bg-bg1/40 px-2 py-1 text-xs text-text-main hover:bg-bg1/60"
                onClick={() => setInspectCard(null)}
              >
                닫기
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
              <div className="flex justify-center">
                <div className="h-48 w-32 rounded-2xl border border-line bg-bg1/40 flex items-center justify-center">
                  {findCardImage(inspectCard.code) ? (
                    <img
                      src={findCardImage(inspectCard.code)}
                      alt={inspectCard.name}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="text-xs text-text-sub">이미지 없음</div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg border border-line bg-bg1/40 px-3 py-1 text-xs font-semibold text-text-main">
                    MP {inspectCard.costMP}
                  </div>
                </div>
                {renderCardDescription(inspectCard, localizedText(inspectCard), "sm")}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Container>
  );
}
