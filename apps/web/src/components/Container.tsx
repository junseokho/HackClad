import { Backdrop } from "./Backdrop";

export function Container({
  children,
  maxWidth = "max-w-xl",
  className = ""
}: {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}) {
  return (
    <div className={`min-h-dvh text-text-main ${className}`}>
      <Backdrop />
      <div className={`mx-auto w-full ${maxWidth} px-4 py-6 sm:py-10`}>{children}</div>
    </div>
  );
}
