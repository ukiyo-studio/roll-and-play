import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const gameId = Number(id);

  if (!Number.isFinite(gameId)) {
    return NextResponse.json({ error: "Invalid game id" }, { status: 400 });
  }

  const body = (await req.json()) as { tier?: string | null };
  const tier = body.tier ?? null;

  if (tier !== null && !["S", "A", "B", "C", "D"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  await prisma.game.update({
    where: { id: gameId },
    data: { tier },
  });

  return NextResponse.json({ ok: true });
}
