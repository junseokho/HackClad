export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl2 border border-line bg-panel backdrop-blur-md shadow-neon p-4 sm:p-6">
      {children}
    </div>
  );
}
