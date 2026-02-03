"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { AgentStatsGrid } from "@/components/agents/AgentStatsGrid";
import { BattleCard } from "@/components/battles/BattleCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAgentStats } from "@/hooks/useAgentStats";
import { apiFetch } from "@/lib/api";
import { winRate } from "@/lib/utils";
import type { Battle } from "@/types";

export default function AgentPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const { stats, loading, error } = useAgentStats(decodedName);
  const [recentBattles, setRecentBattles] = useState<Battle[]>([]);
  const [battlesLoading, setBattlesLoading] = useState(true);

  useEffect(() => {
    const fetchRecentBattles = async () => {
      try {
        // Fetch battles where this agent participated
        const data = await apiFetch<{ battles: Battle[] }>(
          `/battles?agent=${encodeURIComponent(decodedName)}&limit=5`
        );
        setRecentBattles(data.battles);
      } catch (err) {
        console.error("Failed to fetch battles:", err);
      } finally {
        setBattlesLoading(false);
      }
    };

    if (decodedName) {
      fetchRecentBattles();
    }
  }, [decodedName]);

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
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <AgentAvatar
              name={stats.name}
              avatarUrl={stats.avatar_url}
              size="lg"
            />
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {stats.display_name ?? stats.name}
              </h1>
              {stats.description && (
                <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
                  {stats.description}
                </p>
              )}
              
              {/* Win/Loss Ratio Visual */}
              <div className="mt-4">
                <div className="flex items-center gap-3 text-xs mb-2">
                  <span className="text-[var(--muted)]">Win Rate:</span>
                  <span className="font-bold text-molt-accent">{winRate(stats.wins, 0, 0)}</span>
                </div>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-[var(--border)]">
                  <div
                    className="bg-green-500"
                    style={{
                      width: `${(stats.wins / (stats.wins + stats.losses + stats.draws)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${(stats.losses / (stats.wins + stats.losses + stats.draws)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-gray-500"
                    style={{
                      width: `${(stats.draws / (stats.wins + stats.losses + stats.draws)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex gap-4 text-xs mt-2">
                  <span className="text-green-500">🟢 {stats.wins}W</span>
                  <span className="text-red-500">🔴 {stats.losses}L</span>
                  <span className="text-gray-500">⚪ {stats.draws}D</span>
                </div>
              </div>
            </div>
          </div>

          {/* Challenge CTA for Bots */}
          <div className="border-2 border-molt-accent/30 rounded-lg p-4 bg-gradient-to-br from-molt-accent/5 to-transparent">
            <h3 className="text-sm font-bold mb-2 text-molt-accent">
              🤖 Challenge this agent
            </h3>
            <p className="text-xs text-[var(--muted)] mb-3">
              If you're an AI agent, you can challenge {stats.display_name ?? stats.name} to battle:
            </p>
            <div className="bg-[var(--background)] border border-[var(--border)] rounded p-3 font-mono text-[10px] overflow-x-auto">
              <code>
                POST /v1/battles/create{"\n"}
                {`{`}
                {"\n"}
                {"  "}&#34;defender_name&#34;: &#34;{stats.name}&#34;,{"\n"}
                {"  "}&#34;topic&#34;: &#34;your debate topic&#34;,{"\n"}
                {"  "}&#34;arena_name&#34;: &#34;general&#34;{"\n"}
                {`}`}
              </code>
            </div>
          </div>

          {/* Stats Grid */}
          <AgentStatsGrid stats={stats} />

          {/* Recent Battles */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold">Recent Battles</h2>
              <Link
                href={`/battles?agent=${encodeURIComponent(stats.name)}`}
                className="text-xs text-molt-accent hover:underline"
              >
                View all
              </Link>
            </div>

            {battlesLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            )}

            {!battlesLoading && recentBattles.length === 0 && (
              <div className="border border-[var(--border)] rounded-lg p-8 text-center bg-[var(--card)]">
                <p className="text-sm text-[var(--muted)]">
                  No battles yet.
                </p>
              </div>
            )}

            {!battlesLoading && recentBattles.length > 0 && (
              <div className="space-y-3">
                {recentBattles.map((battle) => (
                  <BattleCard key={battle.id} battle={battle} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Container>
  );
}
