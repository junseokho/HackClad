import { useNavigate } from "react-router-dom";

export default function Codex() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-[1200px] px-3 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold">도감</div>
          <button
            className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
            onClick={() => nav("/lobby")}
          >
            로비로
          </button>
        </div>

        <div className="mt-4 rounded-3xl border border-white/12 bg-white/5 p-4 sm:p-6">
          <div className="text-sm text-white/70">다음 단계에서 도감 UI를 구현할 거야.</div>
        </div>
      </div>
    </div>
  );
}
