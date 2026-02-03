export function OddsBar({
  challengerPct,
  defenderPct,
  challengerName,
  defenderName,
}: {
  challengerPct: number;
  defenderPct: number;
  challengerName: string;
  defenderName: string;
}) {
  const cWidth = Math.max(challengerPct, 5);
  const dWidth = Math.max(defenderPct, 5);

  return (
    <div className="space-y-1">
      <div className="flex rounded-full overflow-hidden h-6 bg-[var(--border)]">
        <div
          className="bg-molt-accent flex items-center justify-center text-[10px] font-bold text-black transition-all duration-500"
          style={{ width: `${cWidth}%` }}
        >
          {challengerPct > 15 && `${challengerPct}%`}
        </div>
        <div
          className="bg-status-voting flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
          style={{ width: `${dWidth}%` }}
        >
          {defenderPct > 15 && `${defenderPct}%`}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-[var(--muted)]">
        <span>{challengerName}</span>
        <span>{defenderName}</span>
      </div>
    </div>
  );
}
