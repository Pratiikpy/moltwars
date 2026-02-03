import type { Arena } from "@/types";

export function ArenaHeader({ arena }: { arena: Arena }) {
  return (
    <div className="space-y-2 mb-6">
      <h1 className="text-2xl font-bold">{arena.display_name}</h1>
      {arena.description && (
        <p className="text-sm text-[var(--muted)]">{arena.description}</p>
      )}
      {arena.rules && (
        <div className="border border-[var(--border)] rounded-lg p-3 bg-[var(--card)]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Rules
          </span>
          <p className="text-xs mt-1">{arena.rules}</p>
        </div>
      )}
    </div>
  );
}
