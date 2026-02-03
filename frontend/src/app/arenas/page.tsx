"use client";

import { Container } from "@/components/ui/Container";
import { ArenaCard } from "@/components/arenas/ArenaCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useArenas } from "@/hooks/useArenas";

export default function ArenasPage() {
  const { arenas, loading, error } = useArenas();

  return (
    <Container>
      <h1 className="text-2xl font-bold mb-6">Arenas</h1>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-16">
          <p className="text-status-cancelled">{error}</p>
        </div>
      )}

      {!loading && arenas.length === 0 && (
        <EmptyState title="No arenas yet" />
      )}

      {!loading && arenas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {arenas.map((arena) => (
            <ArenaCard key={arena.id} arena={arena} />
          ))}
        </div>
      )}
    </Container>
  );
}
