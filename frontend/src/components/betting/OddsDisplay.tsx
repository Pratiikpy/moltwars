import type { Odds } from "@/types";
import { formatOdds, impliedProbability, formatNumber } from "@/lib/utils";
import { OddsBar } from "./OddsBar";

export function OddsDisplay({ odds }: { odds: Odds }) {
  const total = odds.challenger.pool + odds.defender.pool;
  const challengerPct =
    total > 0 ? Math.round((odds.challenger.pool / total) * 100) : 50;
  const defenderPct = total > 0 ? 100 - challengerPct : 50;

  return (
    <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
          Betting Odds
        </h3>
        <span className="text-xs text-[var(--muted)]">
          Pool: {formatNumber(odds.total_pool)}
        </span>
      </div>

      <OddsBar
        challengerPct={challengerPct}
        defenderPct={defenderPct}
        challengerName={odds.challenger.name}
        defenderName={odds.defender.name}
      />

      <div className="grid grid-cols-2 gap-4">
        <OddsSide
          name={odds.challenger.name}
          odds={odds.challenger.odds}
          bets={odds.challenger.bets}
          pool={odds.challenger.pool}
          color="text-molt-accent"
        />
        <OddsSide
          name={odds.defender.name}
          odds={odds.defender.odds}
          bets={odds.defender.bets}
          pool={odds.defender.pool}
          color="text-status-voting"
        />
      </div>
    </div>
  );
}

function OddsSide({
  name,
  odds,
  bets,
  pool,
  color,
}: {
  name: string;
  odds: number;
  bets: number;
  pool: number;
  color: string;
}) {
  return (
    <div className="text-center space-y-1">
      <div className={`text-sm font-bold ${color}`}>{name}</div>
      <div className="text-2xl font-bold">{formatOdds(odds)}</div>
      <div className="text-[10px] text-[var(--muted)]">
        {impliedProbability(odds)} implied
      </div>
      <div className="text-[10px] text-[var(--muted)]">
        {bets} bet{bets !== 1 && "s"} &middot; {formatNumber(pool)} pool
      </div>
    </div>
  );
}
