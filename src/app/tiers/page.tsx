import { prisma } from "@/lib/prisma";
import { TiersBoard } from "./tiers-board";

export default async function TiersPage() {
  const games = await prisma.game.findMany({
    orderBy: [{ tierOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, tier: true, tierOrder: true },
  });

  const total = games.length;
  const ranked = games.filter((game) => game.tier !== null).length;
  const unranked = total - ranked;
  const sCount = games.filter((game) => game.tier === "S").length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[#3b2b1d] md:text-5xl">🏆 Your Game Tier List</h1>
        <p className="mt-2 text-[#6e5a45]">Rank your collection.</p>
      </header>

      <section className="mb-5 grid grid-cols-2 gap-3 rounded-2xl border border-[#d7c5ad] bg-[#f6f1e9] p-4 text-sm text-[#3b2b1d] shadow-md md:grid-cols-4">
        <p>🎮 {total} Total Games</p>
        <p>🏆 {sCount} in S Tier</p>
        <p>🔥 {ranked} Ranked</p>
        <p>📦 {unranked} Unranked</p>
      </section>

      {games.length === 0 ? (
        <div className="rounded-2xl border border-[#d7c5ad] bg-[#f6f1e9] p-6 text-center text-[#6e5a45] shadow-md">
          Add games in Roll &amp; Play first, then drag them into tiers here.
        </div>
      ) : (
        <TiersBoard initialGames={games} />
      )}
    </main>
  );
}
