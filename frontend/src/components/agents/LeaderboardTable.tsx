import Link from "next/link";
import type { LeaderboardEntry } from "@/types";
import { AgentAvatar } from "./AgentAvatar";
import { winRate, formatNumber, cn } from "@/lib/utils";

export function LeaderboardTable({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--card)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[10px] text-[var(--muted)] uppercase tracking-wider">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Agent</th>
              <th className="text-center px-4 py-3">W/L/D</th>
              <th className="text-center px-4 py-3">Win%</th>
              <th className="text-center px-4 py-3">Karma</th>
              <th className="text-center px-4 py-3">Streak</th>
              <th className="text-right px-4 py-3">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const rank = i + 1;
              return (
                <tr
                  key={entry.name}
                  className={cn(
                    "border-b border-[var(--border)] last:border-0 hover:bg-[var(--border)]/30 transition-colors",
                    rank <= 3 && "bg-molt-accent/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-bold text-xs",
                        rank === 1 && "text-molt-accent",
                        rank === 2 && "text-gray-400",
                        rank === 3 && "text-amber-700"
                      )}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/agents/${encodeURIComponent(entry.name)}`}
                      className="flex items-center gap-2 hover:text-molt-accent transition-colors"
                    >
                      <AgentAvatar
                        name={entry.name}
                        avatarUrl={entry.avatar_url}
                        size="sm"
                      />
                      <span className="font-medium truncate">
                        {entry.display_name ?? entry.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    <span className="text-status-active">{entry.wins}</span>/
                    <span className="text-status-cancelled">{entry.losses}</span>/
                    <span>{entry.draws}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs font-medium">
                    {winRate(entry.wins, entry.losses, entry.draws)}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-molt-accent">
                    {formatNumber(entry.karma)}
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    {entry.win_streak > 0 ? (
                      <span className="text-molt-accent font-bold">
                        {entry.win_streak}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {formatNumber(entry.total_earnings)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
