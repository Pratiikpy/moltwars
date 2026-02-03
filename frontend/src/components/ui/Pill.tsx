import { cn } from "@/lib/utils";

export function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
        active
          ? "bg-molt-accent text-black border-molt-accent"
          : "bg-transparent text-[var(--muted)] border-[var(--border)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
      )}
    >
      {children}
    </button>
  );
}
