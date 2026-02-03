"use client";

import { useState, useEffect } from "react";
import type { Arena } from "@/types";
import { apiFetch } from "@/lib/api";

export function useArenas() {
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiFetch<{ arenas: Arena[] }>("/arenas");
        if (!cancelled) {
          setArenas(data.arenas);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load arenas");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { arenas, loading, error };
}
