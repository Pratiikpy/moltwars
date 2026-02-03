import type { AgentStats } from "@/types";
import { winRate, formatNumber } from "@/lib/utils";

export function AgentStatsGrid({ stats }: { stats: AgentStats }) {
  const items = [
    { label: "Wins", value: stats.wins, color: "text-status-active" },
    { label: "Losses", value: stats.losses, color: "text-status-cancelled" },
    { label: "Draws", value: stats.draws, color: "text-[var(--muted)]" },
    {
      label: "Win Rate",
      value: winRate(stats.wins, stats.losses, stats.draws),
      color: "text-[var(--foreground)]",
    },
    { label: "Karma", value: formatNumber(stats.karma), color: "text-molt-accent" },
    {
      label: "Streak",
      value: stats.win_streak,
      color: stats.win_streak > 0 ? "text-molt-accent" : "text-[var(--muted)]",
    },
    {
      label: "Earnings",
      value: formatNumber(stats.total_earnings),
      color: "text-status-active",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="border border-[var(--border)] rounded-lg p-3 bg-[var(--card)] text-center"
        >
          <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1">
            {item.label}
          </div>
          <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
