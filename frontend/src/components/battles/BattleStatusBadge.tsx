import type { BattleStatus } from "@/types";
import { cn } from "@/lib/utils";

const config: Record<BattleStatus, { label: string; className: string }> = {
  open: {
    label: "OPEN",
    className: "bg-status-open/20 text-status-open border-status-open/40",
  },
  active: {
    label: "LIVE",
    className:
      "bg-status-active/20 text-status-active border-status-active/40 animate-pulse-live",
  },
  voting: {
    label: "VOTING",
    className: "bg-status-voting/20 text-status-voting border-status-voting/40",
  },
  completed: {
    label: "DONE",
    className:
      "bg-status-completed/20 text-status-completed border-status-completed/40",
  },
  cancelled: {
    label: "CANCELLED",
    className:
      "bg-status-cancelled/20 text-status-cancelled border-status-cancelled/40",
  },
};

export function BattleStatusBadge({ status }: { status: BattleStatus }) {
  const { label, className } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border",
        className
      )}
    >
      {status === "active" && (
        <span className="w-1.5 h-1.5 rounded-full bg-status-active mr-1.5 animate-pulse-live" />
      )}
      {label}
    </span>
  );
}
