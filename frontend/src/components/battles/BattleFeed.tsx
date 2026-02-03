"use client";

import type { Battle } from "@/types";
import { BattleCard } from "./BattleCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

export function BattleFeed({
  battles,
  loading,
  hasMore,
  onLoadMore,
}: {
  battles: Battle[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  if (loading && battles.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <EmptyState
        title="No battles found"
        description="Check back later or try a different filter."
      />
    );
  }

  return (
    <div className="space-y-3">
      {battles.map((battle) => (
        <BattleCard key={battle.id} battle={battle} />
      ))}

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="w-full py-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}
