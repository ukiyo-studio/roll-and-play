import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://boardgamegeek.com/xmlapi2";
const MIN_DELAY_MS = 5000;

let lastRequestAt = 0;

type XmlNode = Record<string, unknown>;

type BggThing = {
  bggId: number;
  name: string;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTime: number | null;
  thumbnailUrl: string | null;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getNodeValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null && "#text" in value) {
    const text = (value as { "#text"?: unknown })["#text"];
    return typeof text === "string" ? text : null;
  }
  return null;
}

function getIntValue(value: unknown): number | null {
  if (typeof value === "object" && value !== null && "@_value" in value) {
    const raw = (value as { "@_value"?: unknown })["@_value"];
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const raw = getNodeValue(value);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPrimaryName(item: XmlNode): string | null {
  const names = toArray(item.name as XmlNode | XmlNode[] | undefined);
  const primary = names.find((entry) => (entry["@_type"] as string | undefined) === "primary");
  const fallback = names[0];
  const selected = primary ?? fallback;
  if (!selected) return null;

  const raw = selected["@_value"];
  return typeof raw === "string" ? raw : null;
}

export function parseXml<T>(xml: string): T {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: false,
    trimValues: true,
  });

  return parser.parse(xml) as T;
}

export async function throttledFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now();
  const wait = MIN_DELAY_MS - (now - lastRequestAt);
  if (wait > 0) {
    await sleep(wait);
  }

  lastRequestAt = Date.now();
  return fetch(url, init);
}

async function fetchWithRetry(url: string, retries = 5): Promise<Response> {
  let attempt = 0;
  let backoff = 1000;

  while (attempt <= retries) {
    const response = await throttledFetch(url);

    if (response.status !== 500 && response.status !== 503) {
      return response;
    }

    if (attempt === retries) {
      return response;
    }

    await sleep(backoff);
    backoff *= 2;
    attempt += 1;
  }

  return throttledFetch(url);
}

export async function fetchCollection(username: string): Promise<number[]> {
  const safe = username.trim();
  if (!safe) {
    throw new Error("Please provide a BGG username.");
  }

  const encoded = encodeURIComponent(safe);
  const url = `${BASE_URL}/collection?username=${encoded}&own=1&subtype=boardgame`;

  let attempt = 0;
  let waitMs = 1500;

  while (attempt < 8) {
    const response = await fetchWithRetry(url);

    if (response.status === 202) {
      await sleep(waitMs);
      waitMs = Math.min(waitMs * 2, 12000);
      attempt += 1;
      continue;
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("BGG user not found.");
      }
      throw new Error("Could not fetch BGG collection right now.");
    }

    const xml = await response.text();
    const parsed = parseXml<{ items?: { item?: XmlNode | XmlNode[] } }>(xml);
    const items = toArray(parsed.items?.item);

    const ids = items
      .filter((item) => {
        const subtype = item["@_subtype"];
        return subtype === "boardgame";
      })
      .map((item) => Number(item["@_objectid"]))
      .filter((id) => Number.isFinite(id));

    return [...new Set(ids)];
  }

  throw new Error("BGG is still preparing the collection. Please try again shortly.");
}

export async function fetchThings(ids: number[]): Promise<BggThing[]> {
  if (ids.length === 0) return [];

  const url = `${BASE_URL}/thing?id=${ids.join(",")}&stats=1`;
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error("Could not fetch BGG game details.");
  }

  const xml = await response.text();
  const parsed = parseXml<{ items?: { item?: XmlNode | XmlNode[] } }>(xml);
  const items = toArray(parsed.items?.item);

  return items
    .map((item) => {
      const bggId = Number(item["@_id"]);
      const name = getPrimaryName(item);
      if (!Number.isFinite(bggId) || !name) return null;

      return {
        bggId,
        name,
        yearPublished: getIntValue(item.yearpublished),
        minPlayers: getIntValue(item.minplayers),
        maxPlayers: getIntValue(item.maxplayers),
        playingTime: getIntValue(item.playingtime),
        thumbnailUrl: getNodeValue(item.thumbnail),
      } satisfies BggThing;
    })
    .filter((item): item is BggThing => item !== null);
}
