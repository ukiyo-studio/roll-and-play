import {
  addGameAction,
  deleteGameAction,
  getAllGames,
  markAsPlayedAction,
  pickRandomGameAction,
  renameGameAction,
} from "./actions";
import { PlayedToggle } from "./played-toggle";
import { RandomReveal } from "./random-reveal";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const value = params[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return value[0] ?? null;
  return null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const games = await getAllGames();

  const addError = readParam(params, "addError");
  const listError = readParam(params, "listError");
  const pickerNote = readParam(params, "pickerNote");

  const preferUnplayed = readParam(params, "preferUnplayed") === "1";
  const pickerMode = readParam(params, "pickerMode") ?? "any";
  const pickedId = Number(readParam(params, "pickedId") ?? "0");
  const pickedGame = games.find((game) => game.id === pickedId) ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-8">
      <section className="text-center">
        <h1 className="text-4xl font-black tracking-tight text-[#3b2b1d] md:text-5xl">🎲 Roll &amp; Play</h1>
        <p className="mt-2 text-[#6e5a45]">Game night at the table, one roll away.</p>
      </section>

      <section className="rounded-2xl border border-[#d7c5ad] bg-[#f6f1e9] p-6 text-center shadow-md">
        <h2 className="mb-5 text-2xl font-black text-[#3b2b1d]">🎲 What Are We Playing Tonight?</h2>

        <form action={pickRandomGameAction} className="mx-auto mb-5 flex max-w-xl flex-col items-center gap-4">
          <div className="flex gap-6 text-sm text-[#3b2b1d]">
            <label className="flex items-center gap-2">
              <input type="radio" name="preferUnplayed" value="1" defaultChecked={preferUnplayed} /> Prefer unplayed
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="preferUnplayed" value="0" defaultChecked={!preferUnplayed} /> Any game
            </label>
          </div>

          <select
            name="pickerMode"
            defaultValue={pickerMode}
            className="rounded-xl border border-[#d7c5ad] bg-[#fff9f1] px-3 py-2 text-sm text-[#3b2b1d]"
          >
            <option value="any">🎲 Any Game</option>
            <option value="top">🏆 Top Tier Only</option>
            <option value="sa">⭐ S + A Only</option>
            <option value="weighted">🎯 Weighted by Tier</option>
          </select>

          <button
            type="submit"
            disabled={games.length === 0}
            className="flex h-28 w-28 items-center justify-center rounded-full bg-[#f2c14e] text-4xl shadow-md transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            🎲
          </button>
          <span className="text-sm font-semibold text-[#6e5a45]">Roll for Tonight</span>
        </form>

        {games.length === 0 ? <p className="text-sm text-[#6e5a45]">Add some games first.</p> : null}
        {pickerNote ? <p className="mb-3 text-sm text-[#6e5a45]">{pickerNote}</p> : null}

        <RandomReveal
          gameNames={games.map((game) => game.name)}
          selectedName={pickedGame ? pickedGame.name : null}
        />

        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          <form action={markAsPlayedAction}>
            <input type="hidden" name="id" value={pickedGame?.id ?? ""} />
            <input type="hidden" name="preferUnplayed" value={preferUnplayed ? "1" : "0"} />
            <input type="hidden" name="pickerMode" value={pickerMode} />
            <button
              type="submit"
              disabled={!pickedGame}
              className="rounded-xl bg-[#4caf50] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark as Played
            </button>
          </form>

          <form action={pickRandomGameAction}>
            <input type="hidden" name="preferUnplayed" value={preferUnplayed ? "1" : "0"} />
            <input type="hidden" name="pickerMode" value={pickerMode} />
            <button
              type="submit"
              disabled={games.length === 0}
              className="rounded-xl bg-[#3a7ca5] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Pick Again
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border border-[#d7c5ad] bg-[#f6f1e9] p-5 shadow-md">
        <h2 className="mb-3 text-xl font-bold text-[#3b2b1d]">📦 Add a Game to Your Shelf</h2>
        <form action={addGameAction} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="name"
            placeholder="Enter game name…"
            className="w-full rounded-xl border border-[#d7c5ad] bg-[#fff9f1] px-4 py-3 text-[#3b2b1d] outline-none transition focus:border-[#3a7ca5]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#3a7ca5] px-5 py-3 font-semibold text-white transition hover:scale-105"
          >
            Add Game
          </button>
        </form>
        {addError ? <p className="mt-2 text-sm text-[#d64045]">{addError}</p> : null}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-[#3b2b1d]">🧩 Game Collection</h2>

        {games.length === 0 ? (
          <div className="rounded-2xl border border-[#d7c5ad] bg-[#f6f1e9] p-6 text-center text-[#6e5a45] shadow-md">
            🎲 No games yet. Start building your collection above to pick something fun to play.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {games.map((game) => (
              <li
                key={game.id}
                className="rounded-2xl border border-[#d7c5ad] bg-[#f6f1e9] p-4 shadow-md transition hover:scale-[1.02]"
              >
                <p className="text-lg font-bold text-[#3b2b1d]">{game.name}</p>

                {game.minPlayers !== null && game.maxPlayers !== null ? (
                  <p className="mt-1 text-sm text-[#6e5a45]">👥 {game.minPlayers}–{game.maxPlayers} players</p>
                ) : null}
                {game.playingTime !== null ? (
                  <p className="text-sm text-[#6e5a45]">⏱ {game.playingTime} min</p>
                ) : null}

                <div className="mt-3 flex items-center justify-between">
                  <PlayedToggle id={game.id} played={game.played} />
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      game.played ? "bg-[#4caf50] text-white" : "bg-[#d64045] text-white"
                    }`}
                  >
                    {game.played ? "Played" : "Unplayed"}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <details>
                    <summary className="cursor-pointer rounded-lg border border-[#c4b094] bg-[#fff9f1] px-3 py-1 text-sm text-[#3b2b1d]">
                      Edit
                    </summary>
                    <form action={renameGameAction} className="mt-2 flex flex-col gap-2">
                      <input type="hidden" name="id" value={game.id} />
                      <input
                        type="text"
                        name="name"
                        defaultValue={game.name}
                        className="rounded-lg border border-[#d7c5ad] bg-white px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-[#3a7ca5] px-3 py-2 text-sm font-medium text-white"
                      >
                        Save
                      </button>
                    </form>
                  </details>

                  <form action={deleteGameAction}>
                    <input type="hidden" name="id" value={game.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-[#d64045] px-3 py-1 text-sm font-medium text-white"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {listError ? <p className="mt-3 text-sm text-[#d64045]">{listError}</p> : null}
      </section>
    </main>
  );
}
