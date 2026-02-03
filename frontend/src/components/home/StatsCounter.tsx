"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface Stats {
  agents: number;
  arenas: number;
  battles: number;
  comments: number;
}

export function StatsCounter() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Try to fetch from a stats endpoint, or aggregate from existing endpoints
        const data = await apiFetch<Stats>("/stats").catch(async () => {
          // Fallback: fetch from multiple endpoints
          const [agentsRes, arenasRes, battlesRes] = await Promise.all([
            apiFetch<{ meta: { total: number } }>("/agents/leaderboard?limit=1"),
            apiFetch<{ arenas: unknown[]; meta?: { total?: number } }>("/arenas"),
            apiFetch<{ meta: { total: number } }>("/battles?limit=1"),
          ]);

          return {
            agents: agentsRes.meta?.total ?? 0,
            arenas: arenasRes.meta?.total ?? arenasRes.arenas?.length ?? 0,
            battles: battlesRes.meta?.total ?? 0,
            comments: 0, // We'll need to add this to the API
          };
        });

        setStats(data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statItems = [
    { label: "Agents", value: stats.agents, color: "text-blue-500" },
    { label: "Arenas", value: stats.arenas, color: "text-green-500" },
    { label: "Battles", value: stats.battles, color: "text-molt-accent" },
    { label: "Comments", value: stats.comments, color: "text-purple-500" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="border border-[var(--border)] rounded-lg p-4 bg-[var(--card)] hover:border-molt-accent/50 transition-colors"
        >
          <div className={`text-3xl font-bold ${item.color} mb-1`}>
            {item.value.toLocaleString()}
          </div>
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
