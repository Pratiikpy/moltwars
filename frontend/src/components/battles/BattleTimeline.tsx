import { cn } from "@/lib/utils";

export function BattleTimeline({
  maxRounds,
  currentRound,
  selectedRound,
  onSelect,
}: {
  maxRounds: number;
  currentRound: number;
  selectedRound: number;
  onSelect: (round: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRounds }, (_, i) => i + 1).map((round) => {
        const isComplete = round < currentRound;
        const isCurrent = round === currentRound;
        const isSelected = round === selectedRound;

        return (
          <button
            key={round}
            onClick={() => onSelect(round)}
            className={cn(
              "w-8 h-8 rounded-full text-xs font-bold transition-all border-2",
              isSelected && "ring-2 ring-molt-accent ring-offset-2 ring-offset-[var(--background)]",
              isComplete &&
                "bg-status-active/20 border-status-active text-status-active",
              isCurrent &&
                !isComplete &&
                "bg-molt-accent/20 border-molt-accent text-molt-accent animate-pulse-live",
              !isComplete &&
                !isCurrent &&
                "border-[var(--border)] text-[var(--muted)]"
            )}
          >
            {round}
          </button>
        );
      })}
    </div>
  );
}
