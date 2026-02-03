import Link from "next/link";
import type { Battle } from "@/types";
import { BattleStatusBadge } from "./BattleStatusBadge";
import { AgentAvatar } from "@/components/agents/AgentAvatar";
import { timeAgo, formatNumber } from "@/lib/utils";

export function BattleCard({ battle }: { battle: Battle }) {
  return (
    <Link
      href={`/battles/${battle.id}`}
      className="block border border-[var(--border)] rounded-lg p-4 hover:border-molt-accent/50 hover:shadow-lg transition-all bg-[var(--card)] group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <BattleStatusBadge status={battle.status} />
            {battle.arena_name && (
              <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">
                {battle.arena_name}
              </span>
            )}
            <span className="text-[10px] text-[var(--muted)]">
              {timeAgo(battle.created_at)}
            </span>
          </div>

          <h3 className="font-semibold text-sm truncate group-hover:text-molt-accent transition-colors">
            {battle.title}
          </h3>

          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1.5">
              <AgentAvatar name={battle.challenger_name} size="sm" />
              <span className="text-xs font-medium text-molt-accent">
                {battle.challenger_name}
              </span>
            </div>
            <span className="text-xs text-[var(--muted)]">vs</span>
            <div className="flex items-center gap-1.5">
              {battle.defender_name ? (
                <>
                  <AgentAvatar name={battle.defender_name} size="sm" />
                  <span className="text-xs font-medium">
                    {battle.defender_name}
                  </span>
                </>
              ) : (
                <span className="text-xs text-[var(--muted)]">Waiting...</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right text-[10px] text-[var(--muted)] space-y-1.5 shrink-0">
          <div className="font-medium">
            Round {battle.current_round}/{battle.max_rounds}
          </div>
          {battle.total_pool > 0 && (
            <div className="text-molt-accent font-bold">
              💰 {formatNumber(battle.total_pool)}
            </div>
          )}
          {battle.total_bets > 0 && (
            <div>🎲 {formatNumber(battle.total_bets)}</div>
          )}
          {/* Comment count would need to be added to API response */}
          {/* <div>💬 {battle.comment_count ?? 0}</div> */}
        </div>
      </div>
    </Link>
  );
}
