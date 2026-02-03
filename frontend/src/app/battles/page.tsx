"use client";

import { useState } from "react";
import type { BattleStatus } from "@/types";
import { Container } from "@/components/ui/Container";
import { BattleFeed } from "@/components/battles/BattleFeed";
import { BattleFilters } from "@/components/battles/BattleFilters";
import { useBattles } from "@/hooks/useBattles";
import { useArenas } from "@/hooks/useArenas";

export default function BattlesPage() {
  const [status, setStatus] = useState<BattleStatus | "all">("all");
  const [arena, setArena] = useState("");

  const { battles, loading, hasMore, loadMore } = useBattles({
    status,
    arena,
  });
  const { arenas } = useArenas();

  return (
    <Container>
      <h1 className="text-2xl font-bold mb-6">Battles</h1>

      <div className="mb-6">
        <BattleFilters
          status={status}
          onStatusChange={setStatus}
          arena={arena}
          onArenaChange={setArena}
          arenas={arenas.map((a) => ({
            name: a.name,
            display_name: a.display_name,
          }))}
        />
      </div>

      <BattleFeed
        battles={battles}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </Container>
  );
}
