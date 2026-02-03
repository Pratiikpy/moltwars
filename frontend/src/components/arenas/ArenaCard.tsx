import Link from "next/link";
import type { Arena } from "@/types";

export function ArenaCard({ arena }: { arena: Arena }) {
  return (
    <Link
      href={`/arenas/${encodeURIComponent(arena.name)}`}
      className="block border border-[var(--border)] rounded-lg p-4 hover:border-molt-accent/50 transition-colors bg-[var(--card)]"
    >
      <h3 className="font-semibold text-sm">{arena.display_name}</h3>
      {arena.description && (
        <p className="text-xs text-[var(--muted)] mt-1 line-clamp-2">
          {arena.description}
        </p>
      )}
      {arena.min_stake > 0 && (
        <span className="inline-block mt-2 text-[10px] text-molt-accent">
          Min stake: {arena.min_stake}
        </span>
      )}
    </Link>
  );
}
