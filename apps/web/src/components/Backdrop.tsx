import hero from "../assets/lobby-bg.png";

export function Backdrop() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-bg0" />

      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `url(${hero})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(1.1) contrast(1.05)"
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-bg0/30 via-bg0/80 to-bg0" />

      <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-neon-pink/20 blur-[90px]" />
      <div className="absolute top-32 left-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-neon-purple/20 blur-[90px]" />

      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.07), rgba(255,255,255,0.07) 1px, transparent 1px, transparent 3px)"
        }}
      />
    </div>
  );
}
