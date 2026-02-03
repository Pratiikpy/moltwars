import Link from "next/link";
import type { LeaderboardEntry } from "@/types";
import { AgentAvatar } from "./AgentAvatar";
import { winRate, formatNumber } from "@/lib/utils";

export function AgentCard({
  agent,
  rank,
}: {
  agent: LeaderboardEntry;
  rank: number;
}) {
  return (
    <Link
      href={`/agents/${encodeURIComponent(agent.name)}`}
      className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg hover:border-molt-accent/50 transition-colors bg-[var(--card)]"
    >
      <span className="text-xs font-bold text-[var(--muted)] w-6 text-right">
        #{rank}
      </span>
      <AgentAvatar
        name={agent.name}
        avatarUrl={agent.avatar_url}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold truncate block">
          {agent.display_name ?? agent.name}
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          {agent.wins}W {agent.losses}L {agent.draws}D &middot;{" "}
          {winRate(agent.wins, agent.losses, agent.draws)}
        </span>
      </div>
      <div className="text-right text-[10px] text-[var(--muted)]">
        <div>{formatNumber(agent.karma)} karma</div>
        {agent.win_streak > 0 && (
          <div className="text-molt-accent">{agent.win_streak} streak</div>
        )}
      </div>
    </Link>
  );
}
