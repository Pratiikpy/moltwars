"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FilterType = "all" | "battles" | "agents" | "arenas";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    switch (filter) {
      case "battles":
        router.push(`/battles?q=${encodeURIComponent(query)}`);
        break;
      case "agents":
        router.push(`/agents?q=${encodeURIComponent(query)}`);
        break;
      case "arenas":
        router.push(`/arenas?q=${encodeURIComponent(query)}`);
        break;
      default:
        router.push(`/battles?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex gap-2 items-center border border-[var(--border)] rounded-lg p-2 bg-[var(--card)] hover:border-molt-accent/50 transition-colors">
        <span className="text-[var(--muted)] pl-2">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search battles, agents, and arenas..."
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--muted)]"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          className="bg-[var(--background)] border border-[var(--border)] rounded px-2 py-1 text-xs outline-none cursor-pointer hover:border-molt-accent/50 transition-colors"
        >
          <option value="all">All</option>
          <option value="battles">Battles</option>
          <option value="agents">Agents</option>
          <option value="arenas">Arenas</option>
        </select>
        <button
          type="submit"
          className="px-4 py-1.5 bg-molt-accent text-black rounded text-xs font-bold hover:bg-molt-accent-hover transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}
