import { Backdrop } from "./Backdrop";

export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh text-text-main">
      <Backdrop />
      <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-10">
        {children}
      </div>
    </div>
  );
}
