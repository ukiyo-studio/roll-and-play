"use client";

import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { useMemo, useState, useTransition } from "react";

type Game = {
  id: number;
  name: string;
  tier: string | null;
};

type TierKey = "S" | "A" | "B" | "C" | "D" | "UNRANKED";

type TierConfig = {
  key: TierKey;
  label: string;
  subtitle: string;
  badgeClass: string;
};

const TIERS: TierConfig[] = [
  { key: "S", label: "S Tier", subtitle: "Legendary", badgeClass: "bg-[#f2c14e] text-[#3b2b1d]" },
  { key: "A", label: "A Tier", subtitle: "Great", badgeClass: "bg-[#4caf50] text-white" },
  { key: "B", label: "B Tier", subtitle: "Solid", badgeClass: "bg-[#3a7ca5] text-white" },
  { key: "C", label: "C Tier", subtitle: "Meh", badgeClass: "bg-[#f39c12] text-white" },
  { key: "D", label: "D Tier", subtitle: "Skip", badgeClass: "bg-[#d64045] text-white" },
  { key: "UNRANKED", label: "Unranked", subtitle: "Not placed yet", badgeClass: "bg-[#8b735a] text-white" },
];

function tierToDbValue(tier: TierKey): string | null {
  return tier === "UNRANKED" ? null : tier;
}

function mapGames(games: Game[]): Record<TierKey, Game[]> {
  const grouped: Record<TierKey, Game[]> = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    UNRANKED: [],
  };

  for (const game of games) {
    if (game.tier === "S" || game.tier === "A" || game.tier === "B" || game.tier === "C" || game.tier === "D") {
      grouped[game.tier].push(game);
    } else {
      grouped.UNRANKED.push(game);
    }
  }

  return grouped;
}

function GameCard({ game }: { game: Game }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `game-${game.id}`,
    data: game,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-xl border border-[#d7c5ad] bg-[#fff9f1] px-3 py-2 text-sm font-semibold text-[#3b2b1d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      {game.name}
    </div>
  );
}

function DropRow({
  tier,
  games,
  activeTier,
}: {
  tier: TierConfig;
  games: Game[];
  activeTier: TierKey | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier-${tier.key}` });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border border-[#d7c5ad] bg-[#f6f1e9] p-4 shadow-md transition ${
        isOver || activeTier === tier.key ? "ring-2 ring-[#3a7ca5]/40" : ""
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className={`rounded-lg px-3 py-2 text-sm font-bold ${tier.badgeClass}`}>
          {tier.key === "S" ? "👑 " : ""}
          {tier.label}
        </div>
        <p className="text-sm text-[#6e5a45]">{tier.subtitle}</p>
      </div>

      {games.length === 0 ? (
        <p className="text-sm text-[#8b735a]">Drag games here</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </section>
  );
}

export function TiersBoard({ initialGames }: { initialGames: Game[] }) {
  const [games, setGames] = useState<Game[]>(initialGames);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [activeTier, setActiveTier] = useState<TierKey | null>(null);
  const [, startTransition] = useTransition();

  const grouped = useMemo(() => mapGames(games), [games]);

  function getTierFromOverId(overId: string): TierKey | null {
    if (!overId.startsWith("tier-")) return null;
    const key = overId.replace("tier-", "");
    if (key === "S" || key === "A" || key === "B" || key === "C" || key === "D" || key === "UNRANKED") {
      return key;
    }
    return null;
  }

  function onDragStart(event: DragStartEvent): void {
    const game = event.active.data.current as Game | undefined;
    setActiveGame(game ?? null);
  }

  function onDragEnd(event: DragEndEvent): void {
    const game = event.active.data.current as Game | undefined;
    setActiveGame(null);
    setActiveTier(null);

    if (!game || !event.over) return;

    const targetTier = getTierFromOverId(String(event.over.id));
    if (!targetTier) return;

    const newTier = tierToDbValue(targetTier);
    if (game.tier === newTier) return;

    setGames((current) =>
      current.map((item) => (item.id === game.id ? { ...item, tier: newTier } : item))
    );

    startTransition(async () => {
      await fetch(`/api/games/${game.id}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: newTier }),
      });
    });
  }

  return (
    <DndContext
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!event.over) {
          setActiveTier(null);
          return;
        }
        setActiveTier(getTierFromOverId(String(event.over.id)));
      }}
    >
      <div className="space-y-4">
        {TIERS.map((tier) => (
          <DropRow key={tier.key} tier={tier} games={grouped[tier.key]} activeTier={activeTier} />
        ))}
      </div>

      <DragOverlay>
        {activeGame ? (
          <div className="rounded-xl border border-[#d7c5ad] bg-[#fff9f1] px-3 py-2 text-sm font-semibold text-[#3b2b1d] shadow-xl">
            {activeGame.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
