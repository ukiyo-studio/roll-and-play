# Roll & Play (PoC)

Minimal single-user board game picker built with:
- Next.js (App Router)
- TypeScript (strict mode)
- Prisma ORM
- SQLite (`prisma/dev.db`, via `DATABASE_URL="file:./dev.db"` in Prisma schema context)

## Features

- Add game by name
- View all games (sorted by newest first)
- Toggle played/unplayed
- Edit game name
- Delete game
- Random game picker with `Prefer unplayed`
- Tier list builder at `/tiers` with drag/drop across S/A/B/C/D and Unranked
- BoardGameGeek import at `/import` (one-way owned collection import)

## Data Model

`Game` fields:
- `id` (`Int`, primary key, autoincrement)
- `name` (`String`, unique)
- `played` (`Boolean`, default `false`)
- `tier` (`String?`)
- `tierOrder` (`Int?`)
- `bggId` (`Int?`, unique)
- `yearPublished` (`Int?`)
- `minPlayers` (`Int?`)
- `maxPlayers` (`Int?`)
- `playingTime` (`Int?`)
- `thumbnailUrl` (`String?`)
- `createdAt` (`DateTime`, default `now()`)

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

App runs at `http://localhost:3000`.

## Random Selection Logic

- If there are no games: UI shows `Add some games first.`
- If `Prefer unplayed` is enabled:
  - If unplayed games exist: choose uniformly from unplayed only.
  - If no unplayed games exist: choose uniformly from all games and show:
    `No unplayed games left. Picking from all games.`
- If `Prefer unplayed` is disabled:
  - Choose uniformly from all games.

Uniformity is implemented by selecting a random index with:
`Math.floor(Math.random() * sourceGames.length)`.

## Assumptions

- Name uniqueness is exact string uniqueness after trimming leading/trailing whitespace.
- Duplicate/rename conflicts are handled server-side and shown as inline error text.
- Delete is immediate (no confirmation modal), per spec.
