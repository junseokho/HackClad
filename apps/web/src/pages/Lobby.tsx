import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { httpGet } from "../api/http";

type MeResp = {
  user: {
    id: string;
    username: string;
    nickname: string;
  };
};

type Mode = "solo" | "coop" | "pvp";

function modeLabel(mode: Mode) {
  if (mode === "solo") return "솔로전";
  if (mode === "coop") return "협동전";
  return "경쟁전";
}

export default function Lobby() {
  const nav = useNavigate();
  const [me, setMe] = useState<MeResp | null>(null);
  const [error, setError] = useState("");

  const [modePanel, setModePanel] = useState<"main" | "pickSize">("main");
  const [pickedMode, setPickedMode] = useState<Mode>("solo");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      nav("/login");
      return;
    }

    httpGet<MeResp>("/api/me", token)
      .then(setMe)
      .catch((e: any) => setError(e?.message ?? "Failed"));
  }, [nav]);

  function logout() {
    localStorage.removeItem("token");
    nav("/login");
  }

  function goMode(mode: Mode) {
    if (mode === "solo") {
      nav("/play?mode=solo");
      return;
    }
    setPickedMode(mode);
    setModePanel("pickSize");
  }

  function startMatch(size: 2 | 3 | 4) {
    nav(`/play?mode=${pickedMode}&size=${size}`);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-red-300">{error}</div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/70">로딩중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
        <div
          className="absolute inset-0 bg-center bg-cover opacity-70"
          style={{
            backgroundImage: "url(/src/assets/lobby-bg.webp)"
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(180,80,255,0.25),transparent_50%),radial-gradient(circle_at_70%_40%,rgba(255,80,180,0.18),transparent_55%)]" />
      </div>

      {/* Container */}
      <div className="mx-auto w-full max-w-[1200px] px-3 pb-10 pt-3 sm:px-6 sm:pt-5">
        {/* Top Bar: nickname only */}
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
            <div className="text-xs text-white/70">프로필</div>
            <div className="text-base font-extrabold leading-tight">{me.user.nickname}</div>
          </div>

          <button
            className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white/80 hover:bg-white/15"
            onClick={logout}
          >
            로그아웃
          </button>
        </div>

        {/* Main layout: left character / middle mode / right quick buttons */}
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.05fr_0.95fr_110px]">
          {/* Left: Character illustration area */}
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/5">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-purple-500/10 via-transparent to-pink-500/10" />
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-white/70">현재 캐릭터</div>
                  <div className="text-lg font-black tracking-tight">캐릭터 이미지</div>
                  <div className="mt-1 text-xs text-white/60">
                    이 영역에 나중에 선택한 캐릭터 일러스트/모델이 표시됨
                  </div>
                </div>
              </div>

              <div className="mt-5 flex h-[320px] items-center justify-center rounded-3xl border border-white/10 bg-black/20 sm:h-[420px]">
                <div className="text-center">
                  <div className="text-5xl font-black tracking-tight sm:text-6xl">캐릭터</div>
                  <div className="mt-2 text-5xl font-black tracking-tight sm:text-6xl">아트</div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle: big mode buttons */}
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/5">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-pink-500/10 via-transparent to-purple-500/10" />
            <div className="p-4 sm:p-6">
              {modePanel === "main" ? (
                <>
                  <div className="text-xs text-white/70">전투 선택</div>
                  <div className="mt-1 text-xl font-black">모드 선택</div>

                  <div className="mt-6 grid gap-3">
                    <button
                      className="h-16 rounded-3xl border border-white/10 bg-purple-500/25 px-5 text-left text-lg font-black tracking-tight shadow-[0_0_30px_rgba(180,80,255,0.25)] hover:bg-purple-500/30"
                      onClick={() => goMode("coop")}
                    >
                      협동전
                      <div className="text-xs font-semibold text-white/70">2/3/4인 보스 레이드 협동</div>
                    </button>

                    <button
                      className="h-16 rounded-3xl border border-white/10 bg-pink-500/25 px-5 text-left text-lg font-black tracking-tight shadow-[0_0_30px_rgba(255,80,180,0.22)] hover:bg-pink-500/30"
                      onClick={() => goMode("pvp")}
                    >
                      경쟁전
                      <div className="text-xs font-semibold text-white/70">보스 레이드 점수 경쟁</div>
                    </button>

                    <button
                      className="h-16 rounded-3xl border border-white/10 bg-white/10 px-5 text-left text-lg font-black tracking-tight hover:bg-white/15"
                      onClick={() => goMode("solo")}
                    >
                      솔로전
                      <div className="text-xs font-semibold text-white/70">혼자 연습/시나리오</div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    className="text-sm text-white/80 hover:text-white"
                    onClick={() => setModePanel("main")}
                  >
                    {"<"} 뒤로 {modeLabel(pickedMode)}
                  </button>

                  <div className="mt-4 text-xl font-black">인원 선택</div>
                  <div className="mt-6 grid gap-3">
                    <button
                      className="h-16 rounded-3xl border border-white/10 bg-white/10 px-5 text-left text-lg font-black hover:bg-white/15"
                      onClick={() => startMatch(2)}
                    >
                      2인전
                      <div className="text-xs font-semibold text-white/70">빠른 매칭</div>
                    </button>
                    <button
                      className="h-16 rounded-3xl border border-white/10 bg-white/10 px-5 text-left text-lg font-black hover:bg-white/15"
                      onClick={() => startMatch(3)}
                    >
                      3인전
                      <div className="text-xs font-semibold text-white/70">표준 매칭</div>
                    </button>
                    <button
                      className="h-16 rounded-3xl border border-white/10 bg-white/10 px-5 text-left text-lg font-black hover:bg-white/15"
                      onClick={() => startMatch(4)}
                    >
                      4인전
                      <div className="text-xs font-semibold text-white/70">풀 파티</div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Character / Codex buttons */}
          <div className="flex flex-row gap-2 lg:flex-col">
            <button
              className="flex-1 rounded-3xl border border-white/12 bg-white/8 px-3 py-4 text-sm font-extrabold text-white/90 hover:bg-white/12"
              onClick={() => nav("/characters")}
            >
              캐릭터
            </button>
            <button
              className="flex-1 rounded-3xl border border-white/12 bg-white/8 px-3 py-4 text-sm font-extrabold text-white/90 hover:bg-white/12"
              onClick={() => nav("/codex")}
            >
              도감
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
