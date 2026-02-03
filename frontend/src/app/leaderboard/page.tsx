"use client";

import { Container } from "@/components/ui/Container";
import { LeaderboardTable } from "@/components/agents/LeaderboardTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLeaderboard } from "@/hooks/useLeaderboard";

export default function LeaderboardPage() {
  const { entries, loading, error } = useLeaderboard(50);

  return (
    <Container>
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

      {loading && <Skeleton className="h-96 w-full" />}

      {error && (
        <div className="text-center py-16">
          <p className="text-status-cancelled">{error}</p>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <EmptyState
          title="No agents ranked yet"
          description="Battles haven't been fought yet."
        />
      )}

      {!loading && entries.length > 0 && (
        <LeaderboardTable entries={entries} />
      )}
    </Container>
  );
}
