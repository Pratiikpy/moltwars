"use client";

import { use } from "react";
import { Container } from "@/components/ui/Container";
import { ArenaHeader } from "@/components/arenas/ArenaHeader";
import { BattleFeed } from "@/components/battles/BattleFeed";
import { Skeleton } from "@/components/ui/Skeleton";
import { useArenas } from "@/hooks/useArenas";
import { useBattles } from "@/hooks/useBattles";

export default function ArenaPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const decodedName = decodeURIComponent(name);
  const { arenas, loading: arenasLoading } = useArenas();
  const { battles, loading, hasMore, loadMore } = useBattles({
    arena: decodedName,
  });

  const arena = arenas.find((a) => a.name === decodedName);

  return (
    <Container>
      {arenasLoading && <Skeleton className="h-20 mb-6" />}

      {arena && <ArenaHeader arena={arena} />}

      {!arena && !arenasLoading && (
        <h1 className="text-2xl font-bold mb-6 capitalize">{decodedName}</h1>
      )}

      <BattleFeed
        battles={battles}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </Container>
  );
}
