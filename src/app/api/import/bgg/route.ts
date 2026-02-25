import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Thing = {
  bggId: number;
  name: string;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  thumbnailUrl: string | null;
};

export async function POST(req: Request) {
  const body = (await req.json()) as { username?: string; things?: Thing[] };
  const username = String(body.username ?? "").trim();
  const things = Array.isArray(body.things) ? body.things : [];

  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const existing = await prisma.game.findMany({
    select: { id: true, name: true, bggId: true },
  });

  const byBggId = new Map<number, { id: number; name: string }>();
  const manualByName = new Map<string, { id: number; name: string }>();

  for (const game of existing) {
    if (typeof game.bggId === "number") {
      byBggId.set(game.bggId, { id: game.id, name: game.name });
    } else {
      manualByName.set(game.name.toLowerCase(), { id: game.id, name: game.name });
    }
  }

  let imported = 0;
  let updated = 0;

  for (const thing of things) {
    if (!Number.isFinite(thing.bggId) || !thing.name) continue;

    const existingByBgg = byBggId.get(thing.bggId);
    if (existingByBgg) {
      await prisma.game.update({
        where: { id: existingByBgg.id },
        data: {
          name: thing.name,
          yearPublished: thing.yearPublished,
          minPlayers: thing.minPlayers,
          maxPlayers: thing.maxPlayers,
          playingTime: thing.playingTime,
          thumbnailUrl: thing.thumbnailUrl,
        },
      });
      updated += 1;
      continue;
    }

    const nameKey = thing.name.toLowerCase();
    const manualMatch = manualByName.get(nameKey);

    if (manualMatch) {
      await prisma.game.update({
        where: { id: manualMatch.id },
        data: {
          name: thing.name,
          bggId: thing.bggId,
          yearPublished: thing.yearPublished,
          minPlayers: thing.minPlayers,
          maxPlayers: thing.maxPlayers,
          playingTime: thing.playingTime,
          thumbnailUrl: thing.thumbnailUrl,
        },
      });
      manualByName.delete(nameKey);
      byBggId.set(thing.bggId, { id: manualMatch.id, name: thing.name });
      updated += 1;
      continue;
    }

    const created = await prisma.game.create({
      data: {
        name: thing.name,
        bggId: thing.bggId,
        yearPublished: thing.yearPublished,
        minPlayers: thing.minPlayers,
        maxPlayers: thing.maxPlayers,
        playingTime: thing.playingTime,
        thumbnailUrl: thing.thumbnailUrl,
        played: false,
        tier: null,
        tierOrder: null,
      },
      select: { id: true },
    });

    byBggId.set(thing.bggId, { id: created.id, name: thing.name });
    imported += 1;
  }

  return NextResponse.json({ ok: true, imported, updated, username, total: things.length });
}
