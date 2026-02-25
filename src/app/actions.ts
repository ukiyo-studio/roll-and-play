"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type GameRecord = {
  id: number;
  name: string;
  played: boolean;
  tier: string | null;
  tierOrder: number | null;
  bggId: number | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  thumbnailUrl: string | null;
  createdAt: Date;
};

type PickerMode = "any" | "top" | "sa" | "weighted";

function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && code === "P2002";
}

function getRandomFrom(games: GameRecord[]): GameRecord | null {
  if (games.length === 0) return null;
  const index = Math.floor(Math.random() * games.length);
  return games[index] ?? null;
}

function pickWeighted(games: GameRecord[]): GameRecord | null {
  if (games.length === 0) return null;

  const weightForTier = (tier: string | null): number => {
    if (tier === "S") return 5;
    if (tier === "A") return 4;
    if (tier === "B") return 3;
    if (tier === "C") return 2;
    if (tier === "D") return 1;
    return 2;
  };

  const weighted = games.map((game) => ({ game, weight: weightForTier(game.tier) }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);

  let roll = Math.random() * totalWeight;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.game;
  }

  return weighted[weighted.length - 1]?.game ?? null;
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

export async function pickRandomGame(preferUnplayed: boolean, mode: PickerMode) {
  const allGames: GameRecord[] = await prisma.game.findMany({
    orderBy: { createdAt: "desc" },
  });

  if (allGames.length === 0) {
    return { game: null, usedFallback: false, note: null as string | null };
  }

  const basePool = preferUnplayed ? allGames.filter((game) => !game.played) : allGames;
  const pool = basePool.length > 0 ? basePool : allGames;
  const usedFallback = preferUnplayed && basePool.length === 0;

  let note: string | null = null;
  let picked: GameRecord | null = null;

  if (mode === "top") {
    const sOnly = pool.filter((game) => game.tier === "S");
    if (sOnly.length === 0) {
      note = "No S-tier games yet.";
      return { game: null, usedFallback, note };
    }
    picked = getRandomFrom(sOnly);
  } else if (mode === "sa") {
    const sa = pool.filter((game) => game.tier === "S" || game.tier === "A");
    if (sa.length === 0) {
      note = "No S/A games yet. Picking from all games.";
      picked = getRandomFrom(pool);
    } else {
      picked = getRandomFrom(sa);
    }
  } else if (mode === "weighted") {
    picked = pickWeighted(pool);
  } else {
    picked = getRandomFrom(pool);
  }

  if (usedFallback) {
    note = "No unplayed games left. Picking from all games.";
  }

  return { game: picked, usedFallback, note };
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
  const preferUnplayed = String(formData.get("preferUnplayed")) === "1";
  const rawMode = String(formData.get("pickerMode") ?? "any");
  const mode: PickerMode =
    rawMode === "top" || rawMode === "sa" || rawMode === "weighted" ? rawMode : "any";

  const picked = await pickRandomGame(preferUnplayed, mode);

  revalidatePath("/");

  const params = new URLSearchParams();
  params.set("preferUnplayed", preferUnplayed ? "1" : "0");
  params.set("pickerMode", mode);

  if (picked.note) {
    params.set("pickerNote", picked.note);
  }

  if (!picked.game) {
    redirect(`/?${params.toString()}`);
  }

  params.set("pickedId", String(picked.game.id));
  redirect(`/?${params.toString()}`);
}

export async function markAsPlayedAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  const preferUnplayed = String(formData.get("preferUnplayed")) === "1";
  const rawMode = String(formData.get("pickerMode") ?? "any");
  const mode: PickerMode =
    rawMode === "top" || rawMode === "sa" || rawMode === "weighted" ? rawMode : "any";

  await updateGame(id, { played: true });
  revalidatePath("/");

  redirect(`/?preferUnplayed=${preferUnplayed ? "1" : "0"}&pickerMode=${mode}`);
}
