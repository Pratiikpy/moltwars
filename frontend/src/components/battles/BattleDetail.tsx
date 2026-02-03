"use client";

import { useState, useCallback } from "react";
import type { BattleDetail as BattleDetailType } from "@/types";
import { BattleStatusBadge } from "./BattleStatusBadge";
import { BattleTimeline } from "./BattleTimeline";
import { RoundViewer } from "./RoundViewer";
import { RoundNavigation } from "./RoundNavigation";
import { OddsDisplay } from "@/components/betting/OddsDisplay";
import { timeAgo } from "@/lib/utils";
import { useBattleStream } from "@/hooks/useBattleStream";
import { useOdds } from "@/hooks/useOdds";
import type { Odds } from "@/types";

export function BattleDetail({
  battle,
  onRefetch,
}: {
  battle: BattleDetailType;
  onRefetch: () => void;
}) {
  const [selectedRound, setSelectedRound] = useState(
    Math.max(1, battle.current_round)
  );

  const handleSSEEvent = useCallback(
    (type: string) => {
      if (
        [
          "argument_submitted",
          "round_complete",
          "voting_started",
          "battle_finalized",
          "battle_accepted",
        ].includes(type)
      ) {
        onRefetch();
      }
    },
    [onRefetch]
  );

  const { connected } = useBattleStream(battle.id, handleSSEEvent);
  const { odds } = useOdds(battle.id);

  const currentRoundData = battle.rounds.find(
    (r) => r.round_number === selectedRound
  );

  return (
    <div className="space-y-6">
      <BattleHeader battle={battle} connected={connected} />

      {odds && <OddsDisplay odds={odds} />}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Rounds
          </h2>
          <BattleTimeline
            maxRounds={battle.max_rounds}
            currentRound={battle.current_round}
            selectedRound={selectedRound}
            onSelect={setSelectedRound}
          />
        </div>

        <RoundNavigation
          currentRound={battle.current_round}
          maxRounds={battle.max_rounds}
          selectedRound={selectedRound}
          onPrev={() => setSelectedRound((p) => Math.max(1, p - 1))}
          onNext={() =>
            setSelectedRound((p) =>
              Math.min(battle.current_round, battle.max_rounds, p + 1)
            )
          }
        />

        <RoundViewer
          round={currentRoundData}
          challengerName={battle.challenger_name}
          defenderName={battle.defender_name ?? "???"}
        />
      </div>

      {battle.winner_name && (
        <div className="border border-status-active/40 rounded-lg p-4 bg-status-active/10 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-status-active">
            Winner
          </span>
          <p className="text-lg font-bold mt-1">{battle.winner_name}</p>
          {battle.win_method && (
            <p className="text-xs text-[var(--muted)] mt-1">
              by {battle.win_method}
            </p>
          )}
        </div>
      )}

      {battle.is_draw && (
        <div className="border border-[var(--border)] rounded-lg p-4 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Draw
          </span>
          <p className="text-sm mt-1 text-[var(--muted)]">
            No clear winner determined.
          </p>
        </div>
      )}
    </div>
  );
}

function BattleHeader({
  battle,
  connected,
}: {
  battle: BattleDetailType;
  connected: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <BattleStatusBadge status={battle.status} />
        {battle.arena_name && (
          <span className="text-xs text-[var(--muted)] uppercase tracking-wider">
            {battle.arena_name}
          </span>
        )}
        <span className="text-xs text-[var(--muted)]">
          {battle.battle_type}
        </span>
        {connected && (
          <span className="text-[10px] text-status-active font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse-live" />
            LIVE
          </span>
        )}
        <span className="text-xs text-[var(--muted)]">
          {timeAgo(battle.created_at)}
        </span>
      </div>

      <h1 className="text-xl font-bold">{battle.title}</h1>

      <p className="text-sm text-[var(--muted)] leading-relaxed">
        {battle.topic}
      </p>

      <div className="flex items-center gap-3 text-sm">
        <span className="font-bold text-molt-accent">
          {battle.challenger_name}
        </span>
        <span className="text-[var(--muted)] text-xs">VS</span>
        <span className="font-bold text-status-voting">
          {battle.defender_name ?? "Awaiting challenger..."}
        </span>
      </div>

      {battle.total_pool > 0 && (
        <div className="flex gap-4 text-xs text-[var(--muted)]">
          <span>Stake pool: {battle.total_pool}</span>
          {battle.total_bets > 0 && (
            <span>Bets: {battle.total_bets}</span>
          )}
          <span>Spectators: {battle.spectator_count}</span>
        </div>
      )}
    </div>
  );
}
