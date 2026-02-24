"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type GameRecord = {
  id: number;
  name: string;
  played: boolean;
  createdAt: Date;
};

function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code === "P2002";
}

export async function createGame(name: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { ok: false, error: "Game name cannot be empty." };
  }

  try {
    await prisma.game.create({
      data: { name: trimmedName },
    });
    return { ok: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { ok: false, error: "That game already exists in your collection." };
    }
    return { ok: false, error: "Could not add game. Please try again." };
  }
}

export async function updateGame(
  id: number,
  data: { name?: string; played?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      return { ok: false, error: "Game name cannot be empty." };
    }

    try {
      await prisma.game.update({
        where: { id },
        data: { name: trimmedName },
      });
      return { ok: true };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return { ok: false, error: "That game name is already in use." };
      }
      return { ok: false, error: "Could not update game name. Please try again." };
    }
  }

  if (data.played !== undefined) {
    try {
      await prisma.game.update({
        where: { id },
        data: { played: data.played },
      });
      return { ok: true };
    } catch {
      return { ok: false, error: "Could not update played status. Please try again." };
    }
  }

  return { ok: false, error: "No update data provided." };
}

export async function deleteGame(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.game.delete({ where: { id } });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not delete game. Please try again." };
  }
}

export async function getAllGames(): Promise<GameRecord[]> {
  return prisma.game.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function pickRandomGame(preferUnplayed: boolean) {
  const allGames: GameRecord[] = await prisma.game.findMany({
    orderBy: { createdAt: "desc" },
  });

  if (allGames.length === 0) {
    return { game: null, usedFallback: false };
  }

  const unplayedGames = allGames.filter((game) => !game.played);

  const sourceGames =
    preferUnplayed && unplayedGames.length > 0 ? unplayedGames : allGames;

  const usedFallback = preferUnplayed && unplayedGames.length === 0;
  const index = Math.floor(Math.random() * sourceGames.length);

  return { game: sourceGames[index], usedFallback };
}

export async function addGameAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "");
  const result = await createGame(name);

  revalidatePath("/");

  if (!result.ok) {
    redirect(`/?addError=${encodeURIComponent(result.error)}`);
  }

  redirect("/");
}

export async function togglePlayedAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const played = String(formData.get("played")) === "true";
  const result = await updateGame(id, { played });

  revalidatePath("/");

  if (!result.ok) {
    redirect(`/?listError=${encodeURIComponent(result.error)}`);
  }

  redirect("/");
}

export async function renameGameAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "");
  const result = await updateGame(id, { name });

  revalidatePath("/");

  if (!result.ok) {
    redirect(`/?listError=${encodeURIComponent(result.error)}`);
  }

  redirect("/");
}

export async function deleteGameAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const result = await deleteGame(id);

  revalidatePath("/");

  if (!result.ok) {
    redirect(`/?listError=${encodeURIComponent(result.error)}`);
  }

  redirect("/");
}

export async function pickRandomGameAction(formData: FormData): Promise<void> {
  const preferUnplayed = String(formData.get("preferUnplayed")) === "on";
  const picked = await pickRandomGame(preferUnplayed);

  revalidatePath("/");

  if (!picked.game) {
    redirect(`/?preferUnplayed=${preferUnplayed ? "1" : "0"}`);
  }

  const params = new URLSearchParams();
  params.set("pickedId", String(picked.game.id));
  params.set("preferUnplayed", preferUnplayed ? "1" : "0");

  if (picked.usedFallback) {
    params.set("pickerNote", "No unplayed games left. Picking from all games.");
  }

  redirect(`/?${params.toString()}`);
}

export async function markAsPlayedAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const preferUnplayed = String(formData.get("preferUnplayed")) === "1";

  await updateGame(id, { played: true });
  revalidatePath("/");

  redirect(`/?preferUnplayed=${preferUnplayed ? "1" : "0"}`);
}
