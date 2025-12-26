import { useEffect, useMemo, useState } from "react";
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
  tags: string;
  isStarter: boolean;
};

type MeResp = {
  user: {
    id: string;
    nickname: string;
    selectedCharacterId?: string | null;
  };
};

type CardsResp = { cards: CardDef[] };
type CharactersResp = { characters: Character[] };

// Static import of Rosette-Δ illustration (fallback if API path matches)
const CHAR_IMAGES = import.meta.glob("../assets/Character_Rosette_delta/Illust/*", {
  eager: true,
  as: "url"
}) as Record<string, string>;

// Static import of Rosette-Δ card images
const CARD_IMAGES = import.meta.glob("../assets/Character_Rosette_delta/{Standard,Enhanced}/*", {
  eager: true,
  as: "url"
}) as Record<string, string>;

function findCharImage(path?: string | null) {
  if (!path) return "";
  const filename = path.split("/").pop();
  if (!filename) return "";
  const key = Object.keys(CHAR_IMAGES).find((k) => k.endsWith(`/${filename}`));
  return key ? CHAR_IMAGES[key] : "";
}

function findCardImage(code: string) {
  const webpStandard = CARD_IMAGES[`../assets/Character_Rosette_delta/Standard/${code}.webp`];
  const webpEnhanced = CARD_IMAGES[`../assets/Character_Rosette_delta/Enhanced/${code}.webp`];
  const pngStandard = CARD_IMAGES[`../assets/Character_Rosette_delta/Standard/${code}.png`];
  const pngEnhanced = CARD_IMAGES[`../assets/Character_Rosette_delta/Enhanced/${code}.png`];
  return webpStandard ?? webpEnhanced ?? pngStandard ?? pngEnhanced ?? "";
}

export default function Characters() {
  const nav = useNavigate();
  const token = useMemo(() => localStorage.getItem("token") ?? "", []);

  const [me, setMe] = useState<MeResp["user"] | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardDef[]>([]);
  const [loadingChars, setLoadingChars] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      nav("/login");
      return;
    }
    loadInitial();
  }, [nav, token]);

  async function loadInitial() {
    try {
      setError("");
      setLoadingChars(true);
      const [meResp, charResp] = await Promise.all([httpGet<MeResp>("/api/me", token), httpGet<CharactersResp>("/api/characters", token)]);
      setMe(meResp.user);
      setCharacters(charResp.characters);

      const firstId = meResp.user.selectedCharacterId ?? charResp.characters[0]?.id ?? null;
      if (firstId) {
        setActiveId(firstId);
        loadCards(firstId);
      }
    } catch (e: any) {
      setError(e?.message ?? "불러오기 실패");
    } finally {
      setLoadingChars(false);
    }
  }

  async function loadCards(characterId: string) {
    if (!characterId) return;
    try {
      setLoadingCards(true);
      setError("");
      const resp = await httpGet<CardsResp>(`/api/cards?characterId=${characterId}`, token);
      setCards(resp.cards);
    } catch (e: any) {
      setError(e?.message ?? "카드 불러오기 실패");
    } finally {
      setLoadingCards(false);
    }
  }

  async function selectCharacter() {
    if (!activeId) return;
    try {
      setSaving(true);
      setError("");
      await httpPost("/api/characters/select", { characterId: activeId }, token);
      setMe((prev) => (prev ? { ...prev, selectedCharacterId: activeId } : prev));
    } catch (e: any) {
      setError(e?.message ?? "캐릭터 선택 실패");
    } finally {
      setSaving(false);
    }
  }

  const active = characters.find((c) => c.id === activeId) ?? null;
  const imageUrl = active ? findCharImage(active.imageUrl ?? undefined) || active.imageUrl || "" : "";

  return (
    <Container maxWidth="max-w-6xl" className="pb-12">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-text-sub">캐릭터 선택</div>
            <div className="text-xl font-black tracking-tight">Choose your Witch</div>
          </div>
          <button className="text-xs text-text-dim hover:text-text-main" onClick={() => nav("/lobby")}>
            ← 로비로
          </button>
        </div>

        {error && <div className="mt-3 rounded-lg border border-red-400/40 bg-red-900/30 px-3 py-2 text-sm text-red-100">{error}</div>}

        <div className="mt-4 grid gap-4 lg:grid-cols-[320px,1fr]">
          {/* Character list */}
          <div className="space-y-2 rounded-2xl border border-line bg-bg1/40 p-3 lg:self-start">
            <div className="mb-1 text-xs font-semibold text-text-sub">캐릭터</div>
            {loadingChars ? (
              <div className="text-sm text-text-dim">불러오는 중...</div>
            ) : (
              characters.map((c) => {
                const selected = c.id === activeId;
                const isCurrent = me?.selectedCharacterId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveId(c.id);
                      loadCards(c.id);
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition hover:border-neon-purple/60 hover:bg-bg2 ${
                      selected ? "border-neon-purple/60 bg-bg2" : "border-line bg-bg1/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold truncate">{c.name}</div>
                      {isCurrent && <span className="text-[11px] text-neon-purple">선택됨</span>}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-text-dim">{c.description}</div>
                  </button>
                );
              })
            )}
          </div>

          {/* Detail */}
          <div className="rounded-2xl border border-line bg-bg1/30 p-4 space-y-4">
            {active ? (
              <>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                  <div className="w-full sm:w-56 lg:w-64">
                    <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-bg2">
                      {imageUrl ? (
                        <img src={imageUrl} alt={active.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-text-dim">이미지 없음</div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 max-w-[520px]">
                    <div className="text-lg font-black">{active.name}</div>
                    <div className="text-sm text-text-main/80 whitespace-pre-line">{active.description}</div>
                    <div className="pt-2">
                      <Button onClick={selectCharacter} disabled={saving} variant="primary">
                        {me?.selectedCharacterId === active.id ? "이미 선택됨" : saving ? "선택 중..." : "이 캐릭터 선택"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold">카드 풀 ({cards.length})</div>
                  {loadingCards ? (
                    <div className="text-sm text-text-dim">카드 불러오는 중...</div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {cards.map((card) => {
                        const img = findCardImage(card.code);
                        return (
                          <div
                            key={card.code}
                            className="rounded-xl border border-line bg-bg2/60 p-3 shadow-sm flex gap-3 items-start"
                          >
                            {img ? (
                              <img src={img} alt={card.name} className="h-20 w-14 rounded-lg border border-line object-cover" />
                            ) : (
                              <div className="h-20 w-14 rounded-lg border border-dashed border-line/60 bg-bg1/50 text-[10px] text-text-dim flex items-center justify-center">
                                이미지 없음
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-semibold text-sm">{card.name}</div>
                                <span className="text-[11px] rounded-md border border-line px-2 py-1 text-text-dim">
                                  MP {card.costMP}
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-neon-purple">{card.isStarter ? "Starter" : "Enhanced"}</div>
                              <div className="mt-2 text-xs text-text-main/80 whitespace-pre-line">{card.description}</div>
                              {card.tags && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {card.tags
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean)
                                    .map((t) => (
                                      <span key={t} className="rounded-md border border-line px-2 py-0.5 text-[11px] text-text-dim">
                                        #{t}
                                      </span>
                                    ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {cards.length === 0 && <div className="text-sm text-text-dim">카드 정보가 없습니다.</div>}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-text-dim">캐릭터를 선택하세요.</div>
            )}
          </div>
        </div>
      </Card>
    </Container>
  );
}
