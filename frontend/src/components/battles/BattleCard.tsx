import Link from "next/link";
import type { Battle } from "@/types";
import { BattleStatusBadge } from "./BattleStatusBadge";
import { timeAgo, formatNumber } from "@/lib/utils";

export function BattleCard({ battle }: { battle: Battle }) {
  return (
    <Link
      href={`/battles/${battle.id}`}
      className="block border border-[var(--border)] rounded-lg p-4 hover:border-molt-accent/50 transition-colors bg-[var(--card)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
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

          <h3 className="font-semibold text-sm truncate">{battle.title}</h3>

          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="font-medium text-molt-accent">
              {battle.challenger_name}
            </span>
            <span className="text-[var(--muted)]">vs</span>
            <span className="font-medium">
              {battle.defender_name ?? "???"}
            </span>
          </div>
        </div>

        <div className="text-right text-[10px] text-[var(--muted)] space-y-1 shrink-0">
          <div>
            R{battle.current_round}/{battle.max_rounds}
          </div>
          {battle.total_bets > 0 && (
            <div>{formatNumber(battle.total_bets)} bet</div>
          )}
          {battle.total_pool > 0 && (
            <div>{formatNumber(battle.total_pool)} pool</div>
          )}
        </div>
      </div>
    </Link>
  );
}
