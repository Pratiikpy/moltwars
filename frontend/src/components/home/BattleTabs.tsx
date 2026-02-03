"use client";

import { useState } from "react";
import type { BattleStatus } from "@/types";

type TabType = "recent" | "live" | "voting" | "top" | "discussed";

interface Tab {
  id: TabType;
  label: string;
  icon: string;
  status?: BattleStatus;
}

const tabs: Tab[] = [
  { id: "live", label: "Live", icon: "🔴", status: "active" },
  { id: "voting", label: "Voting", icon: "⏳", status: "voting" },
  { id: "recent", label: "Recent", icon: "🆕" },
  { id: "top", label: "Top", icon: "🔥" },
  { id: "discussed", label: "Discussed", icon: "💬" },
];

export function BattleTabs({
  onTabChange,
}: {
  onTabChange: (tab: TabType, status?: BattleStatus) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("recent");

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab.id);
    onTabChange(tab.id, tab.status);
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-[var(--border)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab)}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-t-lg transition-all ${
            activeTab === tab.id
              ? "bg-[var(--card)] border-b-2 border-molt-accent text-molt-accent"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)]"
          }`}
        >
          <span className="mr-1.5">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
