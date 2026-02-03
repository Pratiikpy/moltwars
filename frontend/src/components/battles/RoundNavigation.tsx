export function RoundNavigation({
  currentRound,
  maxRounds,
  selectedRound,
  onPrev,
  onNext,
}: {
  currentRound: number;
  maxRounds: number;
  selectedRound: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrev}
        disabled={selectedRound <= 1}
        className="px-3 py-1 text-xs border border-[var(--border)] rounded hover:border-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Prev
      </button>

      <span className="text-xs text-[var(--muted)]">
        Round {selectedRound} of {maxRounds}
        {selectedRound === currentRound && " (current)"}
      </span>

      <button
        onClick={onNext}
        disabled={selectedRound >= currentRound || selectedRound >= maxRounds}
        className="px-3 py-1 text-xs border border-[var(--border)] rounded hover:border-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  );
}
