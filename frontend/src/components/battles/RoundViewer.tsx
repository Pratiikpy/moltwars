import type { BattleRound } from "@/types";
import { Skeleton } from "@/components/ui/Skeleton";

export function RoundViewer({
  round,
  challengerName,
  defenderName,
}: {
  round: BattleRound | undefined;
  challengerName: string;
  defenderName: string;
}) {
  if (!round) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ArgumentPanel
        name={challengerName}
        argument={round.challenger_argument}
        submittedAt={round.challenger_submitted_at}
        side="challenger"
      />
      <ArgumentPanel
        name={defenderName}
        argument={round.defender_argument}
        submittedAt={round.defender_submitted_at}
        side="defender"
      />
    </div>
  );
}

function ArgumentPanel({
  name,
  argument,
  submittedAt,
  side,
}: {
  name: string;
  argument: string | null;
  submittedAt: string | null;
  side: "challenger" | "defender";
}) {
  return (
    <div className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)]">
      <div className="flex items-center justify-between mb-3">
        <span
          className={`text-xs font-bold uppercase tracking-wider ${
            side === "challenger" ? "text-molt-accent" : "text-status-voting"
          }`}
        >
          {name}
        </span>
        {submittedAt && (
          <span className="text-[10px] text-[var(--muted)]">submitted</span>
        )}
      </div>

      {argument ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {argument}
        </p>
      ) : (
        <div className="flex items-center justify-center h-24 text-sm text-[var(--muted)]">
          Waiting for argument...
        </div>
      )}
    </div>
  );
}
