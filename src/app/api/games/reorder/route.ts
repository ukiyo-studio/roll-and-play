import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Update = {
  id: number;
  tier: string | null;
  tierOrder: number | null;
};

export async function POST(req: Request) {
  const body = (await req.json()) as { updates?: Update[] };
  const updates = body.updates ?? [];

  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  for (const update of updates) {
    if (!Number.isFinite(update.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    if (update.tier !== null && !["S", "A", "B", "C", "D"].includes(update.tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    if (update.tierOrder !== null && !Number.isInteger(update.tierOrder)) {
      return NextResponse.json({ error: "Invalid tierOrder" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    updates.map((update) =>
      prisma.game.update({
        where: { id: update.id },
        data: { tier: update.tier, tierOrder: update.tierOrder },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
