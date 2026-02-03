"use client";

import type { BattleStatus } from "@/types";
import { Pill } from "@/components/ui/Pill";

const statuses: { value: BattleStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Live" },
  { value: "open", label: "Open" },
  { value: "voting", label: "Voting" },
  { value: "completed", label: "Completed" },
];

export function BattleFilters({
  status,
  onStatusChange,
  arena,
  onArenaChange,
  arenas,
}: {
  status: BattleStatus | "all";
  onStatusChange: (s: BattleStatus | "all") => void;
  arena: string;
  onArenaChange: (a: string) => void;
  arenas: { name: string; display_name: string }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Pill
            key={s.value}
            active={status === s.value}
            onClick={() => onStatusChange(s.value)}
          >
            {s.label}
          </Pill>
        ))}
      </div>

      {arenas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Pill active={arena === ""} onClick={() => onArenaChange("")}>
            All Arenas
          </Pill>
          {arenas.map((a) => (
            <Pill
              key={a.name}
              active={arena === a.name}
              onClick={() => onArenaChange(a.name)}
            >
              {a.display_name}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );
}
