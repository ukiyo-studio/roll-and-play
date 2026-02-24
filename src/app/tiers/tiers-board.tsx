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
  tierOrder: number | null;
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

function getTierKeyFromGame(game: Game): TierKey {
  if (game.tier === "S" || game.tier === "A" || game.tier === "B" || game.tier === "C" || game.tier === "D") {
    return game.tier;
  }
  return "UNRANKED";
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
    grouped[getTierKeyFromGame(game)].push(game);
  }

  for (const key of Object.keys(grouped) as TierKey[]) {
    grouped[key].sort((a, b) => (a.tierOrder ?? Number.MAX_SAFE_INTEGER) - (b.tierOrder ?? Number.MAX_SAFE_INTEGER));
  }

  return grouped;
}

function GameCard({ game, isSTier = false }: { game: Game; isSTier?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `game-${game.id}`,
    data: game,
  });

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `game-${game.id}`,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        dropRef(node);
      }}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-xl border bg-[#fff9f1] px-3 py-2 text-sm font-semibold text-[#3b2b1d] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isDragging ? "opacity-60" : ""
      } ${isOver ? "ring-2 ring-[#3a7ca5]/40" : ""} ${isSTier ? "border-[#f2c14e] shadow-[0_0_10px_rgba(242,193,78,0.2)]" : "border-[#d7c5ad]"}`}
    >
      {game.name}
    </div>
  );
}

function DropRow({
  tier,
  games,
  activeTier,
  bounce,
}: {
  tier: TierConfig;
  games: Game[];
  activeTier: TierKey | null;
  bounce: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `tier-${tier.key}` });
  const isS = tier.key === "S";

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border p-4 shadow-md transition ${
        isS
          ? "border-[#e3c16f] bg-[#f8efdb] shadow-[0_0_14px_rgba(242,193,78,0.18)] min-h-36"
          : "border-[#d7c5ad] bg-[#f6f1e9]"
      } ${isOver || activeTier === tier.key ? "ring-2 ring-[#3a7ca5]/40" : ""} ${bounce ? "scale-[1.01]" : ""}`}
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
            <GameCard key={game.id} game={game} isSTier={tier.key === "S"} />
          ))}
        </div>
      )}
    </section>
  );
}

function extractGameId(value: string): number | null {
  if (!value.startsWith("game-")) return null;
  const id = Number(value.replace("game-", ""));
  return Number.isFinite(id) ? id : null;
}

function extractTierKey(value: string): TierKey | null {
  if (!value.startsWith("tier-")) return null;
  const key = value.replace("tier-", "");
  if (key === "S" || key === "A" || key === "B" || key === "C" || key === "D" || key === "UNRANKED") {
    return key;
  }
  return null;
}

function applyTierOrders(grouped: Record<TierKey, Game[]>): Game[] {
  const result: Game[] = [];
  for (const tierKey of ["S", "A", "B", "C", "D", "UNRANKED"] as TierKey[]) {
    grouped[tierKey].forEach((game, index) => {
      result.push({
        ...game,
        tier: tierToDbValue(tierKey),
        tierOrder: tierKey === "UNRANKED" ? null : index,
      });
    });
  }
  return result;
}

export function TiersBoard({ initialGames }: { initialGames: Game[] }) {
  const [games, setGames] = useState<Game[]>(initialGames);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [activeTier, setActiveTier] = useState<TierKey | null>(null);
  const [flashTier, setFlashTier] = useState<TierKey | null>(null);
  const [, startTransition] = useTransition();

  const grouped = useMemo(() => mapGames(games), [games]);

  function onDragStart(event: DragStartEvent): void {
    const game = event.active.data.current as Game | undefined;
    setActiveGame(game ?? null);
  }

  function onDragEnd(event: DragEndEvent): void {
    const game = event.active.data.current as Game | undefined;
    setActiveGame(null);
    setActiveTier(null);

    if (!game || !event.over) return;

    const overId = String(event.over.id);
    const targetTierFromRow = extractTierKey(overId);
    const targetGameId = extractGameId(overId);

    const sourceTier = getTierKeyFromGame(game);
    const targetTier =
      targetTierFromRow ??
      (targetGameId !== null
        ? getTierKeyFromGame(games.find((g) => g.id === targetGameId) ?? game)
        : null);

    if (!targetTier) return;

    const nextGrouped = mapGames(games);
    const sourceList = [...nextGrouped[sourceTier]];
    const sourceIndex = sourceList.findIndex((g) => g.id === game.id);
    if (sourceIndex < 0) return;

    sourceList.splice(sourceIndex, 1);
    nextGrouped[sourceTier] = sourceList;

    const targetList = sourceTier === targetTier ? [...sourceList] : [...nextGrouped[targetTier]];
    let targetIndex = targetList.length;

    if (targetGameId !== null) {
      const idx = targetList.findIndex((g) => g.id === targetGameId);
      if (idx >= 0) targetIndex = idx;
    }

    if (sourceTier === targetTier && targetIndex > sourceIndex) {
      targetIndex -= 1;
    }

    targetList.splice(targetIndex, 0, game);
    nextGrouped[targetTier] = targetList;

    const updatedGames = applyTierOrders(nextGrouped);
    setGames(updatedGames);

    setFlashTier(targetTier);
    window.setTimeout(() => setFlashTier(null), 220);

    startTransition(async () => {
      await fetch("/api/games/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: updatedGames.map((g) => ({ id: g.id, tier: g.tier, tierOrder: g.tierOrder })),
        }),
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
        const overId = String(event.over.id);
        const rowTier = extractTierKey(overId);
        if (rowTier) {
          setActiveTier(rowTier);
          return;
        }
        const gameId = extractGameId(overId);
        if (gameId !== null) {
          const game = games.find((g) => g.id === gameId);
          setActiveTier(game ? getTierKeyFromGame(game) : null);
        }
      }}
    >
      <div className="space-y-4">
        {TIERS.map((tier) => (
          <DropRow
            key={tier.key}
            tier={tier}
            games={grouped[tier.key]}
            activeTier={activeTier}
            bounce={flashTier === tier.key}
          />
        ))}
      </div>

      <DragOverlay>
        {activeGame ? (
          <div className="scale-105 rounded-xl border border-[#d7c5ad] bg-[#fff9f1] px-3 py-2 text-sm font-semibold text-[#3b2b1d] shadow-xl">
            {activeGame.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
