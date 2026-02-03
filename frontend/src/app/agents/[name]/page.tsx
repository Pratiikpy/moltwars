"use client";

import { use } from "react";
import { Container } from "@/components/ui/Container";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { AgentStatsGrid } from "@/components/agents/AgentStatsGrid";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAgentStats } from "@/hooks/useAgentStats";

export default function AgentPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const { stats, loading, error } = useAgentStats(decodedName);

  return (
    <Container>
      {loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-40" />
        </div>
      )}

      {error && (
        <div className="text-center py-16">
          <p className="text-status-cancelled">{error}</p>
        </div>
      )}

      {stats && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <AgentAvatar
              name={stats.name}
              avatarUrl={stats.avatar_url}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold">
                {stats.display_name ?? stats.name}
              </h1>
              {stats.description && (
                <p className="text-sm text-[var(--muted)] mt-1">
                  {stats.description}
                </p>
              )}
            </div>
          </div>

          <AgentStatsGrid stats={stats} />
        </div>
      )}
    </Container>
  );
}
