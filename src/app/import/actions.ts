"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fetchCollection, fetchThings } from "@/lib/bgg/client";

type ImportResult = {
  imported: number;
  updated: number;
  batches: number;
};

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function importBggCollection(username: string): Promise<ImportResult> {
  const ids = await fetchCollection(username);

  if (ids.length === 0) {
    return { imported: 0, updated: 0, batches: 0 };
  }

  const batches = chunk(ids, 20);
  let imported = 0;
  let updated = 0;

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

  for (const batch of batches) {
    const things = await fetchThings(batch);

    for (const thing of things) {
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
  }

  return { imported, updated, batches: batches.length };
}

export async function importCollectionAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "").trim();

  if (!username) {
    redirect("/import?error=Please%20enter%20a%20BGG%20username.");
  }

  try {
    const result = await importBggCollection(username);

    revalidatePath("/");
    revalidatePath("/tiers");
    revalidatePath("/import");

    const params = new URLSearchParams();
    params.set("success", "1");
    params.set("username", username);
    params.set("imported", String(result.imported));
    params.set("updated", String(result.updated));
    params.set("batches", String(result.batches));

    redirect(`/import?${params.toString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed. Please try again.";
    redirect(`/import?error=${encodeURIComponent(message)}`);
  }
}
