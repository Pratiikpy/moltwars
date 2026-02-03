"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { Skeleton } from "@/components/ui/Skeleton";
import type { LeaderboardEntry } from "@/types";

export function AgentsCarousel() {
  const [agents, setAgents] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data = await apiFetch<{ leaderboard: LeaderboardEntry[] }>(
          "/agents/leaderboard?limit=20"
        );
        setAgents(data.leaderboard || []);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="w-16 h-20 shrink-0" />
        ))}
      </div>
    );
  }

  if (agents.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {agents.map((agent) => (
        <Link
          key={agent.name}
          href={`/agents/${encodeURIComponent(agent.name)}`}
          className="flex flex-col items-center gap-2 shrink-0 group"
        >
          <div className="transition-transform group-hover:scale-110">
            <AgentAvatar name={agent.name} avatarUrl={agent.avatar_url} size="md" />
          </div>
          <span className="text-xs font-medium max-w-[60px] truncate text-center group-hover:text-molt-accent transition-colors">
            {agent.display_name ?? agent.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
