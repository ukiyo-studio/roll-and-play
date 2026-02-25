"use client";

import { XMLParser } from "fast-xml-parser";
import { useState } from "react";

type Thing = {
  bggId: number;
  name: string;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  thumbnailUrl: string | null;
};

type Status = {
  stage: string;
  error: string | null;
  imported: number;
  updated: number;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true,
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function intValue(node: unknown): number | null {
  if (typeof node !== "object" || node === null || !("@_value" in node)) return null;
  const value = Number((node as { "@_value": unknown })["@_value"]);
  return Number.isFinite(value) ? value : null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function ImportClient() {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>({
    stage: "Idle",
    error: null,
    imported: 0,
    updated: 0,
  });
  const [loading, setLoading] = useState(false);

  async function importNow(): Promise<void> {
    const trimmed = username.trim();
    if (!trimmed) {
      setStatus({ stage: "Idle", error: "Please enter a BGG username.", imported: 0, updated: 0 });
      return;
    }

    setLoading(true);
    setStatus({ stage: "Fetching collection…", error: null, imported: 0, updated: 0 });

    try {
      const collectionUrl = `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(trimmed)}&own=1&subtype=boardgame`;

      let collectionResponse: Response | null = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const response = await fetch(collectionUrl);
        if (response.status === 202) {
          await sleep(1200 * (attempt + 1));
          continue;
        }
        if (response.status === 500 || response.status === 503) {
          await sleep(1000 * 2 ** attempt);
          continue;
        }
        collectionResponse = response;
        break;
      }

      if (!collectionResponse) {
        throw new Error("BGG collection fetch timed out. Please try again.");
      }

      if (!collectionResponse.ok) {
        throw new Error("BGG request denied from browser. Please try again later.");
      }

      const xml = await collectionResponse.text();
      const parsed = parser.parse(xml) as { items?: { item?: Array<Record<string, unknown>> | Record<string, unknown> } };
      const items = toArray(parsed.items?.item);
      const ids = items
        .map((item) => Number(item["@_objectid"]))
        .filter((id) => Number.isFinite(id));

      if (ids.length === 0) {
        setStatus({ stage: "Import complete", error: null, imported: 0, updated: 0 });
        setLoading(false);
        return;
      }

      const batches = chunk(ids, 20);
      const allThings: Thing[] = [];

      for (let index = 0; index < batches.length; index += 1) {
        setStatus((prev) => ({ ...prev, stage: `Fetching game details (Batch ${index + 1} of ${batches.length})…` }));

        const url = `https://boardgamegeek.com/xmlapi2/thing?id=${batches[index]?.join(",")}&stats=1`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch one of the detail batches from BGG.");
        }

        const text = await response.text();
        const details = parser.parse(text) as { items?: { item?: Array<Record<string, unknown>> | Record<string, unknown> } };
        const things = toArray(details.items?.item)
          .map((item) => {
            const names = toArray(item.name as Array<Record<string, unknown>> | Record<string, unknown>);
            const primary = names.find((n) => n["@_type"] === "primary") ?? names[0];
            const name = typeof primary?.["@_value"] === "string" ? String(primary["@_value"]) : null;
            const bggId = Number(item["@_id"]);
            if (!name || !Number.isFinite(bggId)) return null;

            return {
              bggId,
              name,
              yearPublished: intValue(item.yearpublished),
              minPlayers: intValue(item.minplayers),
              maxPlayers: intValue(item.maxplayers),
              playingTime: intValue(item.playingtime),
              thumbnailUrl: typeof item.thumbnail === "string" ? item.thumbnail : null,
            } satisfies Thing;
          })
          .filter((entry): entry is Thing => entry !== null);

        allThings.push(...things);

        if (index < batches.length - 1) {
          await sleep(5000);
        }
      }

      const upsertRes = await fetch("/api/import/bgg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed, things: allThings }),
      });

      if (!upsertRes.ok) {
        throw new Error("Import save failed on server.");
      }

      const result = (await upsertRes.json()) as { imported: number; updated: number };

      setStatus({
        stage: "Import complete",
        error: null,
        imported: result.imported,
        updated: result.updated,
      });

      window.location.href = "/import";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      setStatus((prev) => ({ ...prev, error: message }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#d7c5ad] bg-[#f6f1e9] p-5 shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="username"
          placeholder="BGG username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-xl border border-[#d7c5ad] bg-[#fff9f1] px-4 py-3 text-[#3b2b1d] outline-none transition focus:border-[#3a7ca5]"
        />
        <button
          type="button"
          onClick={importNow}
          disabled={loading}
          className="rounded-xl bg-[#3a7ca5] px-5 py-3 font-semibold text-white transition hover:scale-105 disabled:opacity-60"
        >
          Import Collection
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-[#d7c5ad] bg-[#fff9f1] p-4 text-sm text-[#6e5a45]">
        <p>{status.stage}</p>
        {status.error ? <p className="mt-2 text-[#8f2c32]">{status.error}</p> : null}
        {!status.error && (status.imported > 0 || status.updated > 0) ? (
          <p className="mt-2 text-[#245433]">
            Imported {status.imported}, updated {status.updated}.
          </p>
        ) : null}
      </div>
    </section>
  );
}
