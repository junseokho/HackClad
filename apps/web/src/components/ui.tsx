export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
}) {
  const base =
    "w-full rounded-xl px-3 py-3 text-sm font-medium transition active:scale-[0.99] disabled:opacity-40 disabled:active:scale-100";
  const styles =
    variant === "primary"
      ? "bg-neon-purple text-bg0 shadow-neon hover:shadow-neonStrong"
      : "bg-bg1/40 border border-line text-text-main hover:bg-bg1/70";

  return (
    <button type={type} className={`${base} ${styles}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <input
      className="w-full rounded-xl bg-bg1/40 border border-line px-3 py-2 outline-none focus:border-neon-purple"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
    />
  );
}
