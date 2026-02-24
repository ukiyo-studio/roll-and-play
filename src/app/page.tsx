import {
  addGameAction,
  deleteGameAction,
  getAllGames,
  markAsPlayedAction,
  pickRandomGameAction,
  renameGameAction,
  togglePlayedAction,
} from "./actions";

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
  const pickedId = Number(readParam(params, "pickedId") ?? "0");
  const pickedGame = games.find((game) => game.id === pickedId) ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6 md:p-10">
      <h1 className="text-3xl font-bold">Roll &amp; Play</h1>

      <section className="rounded border p-4">
        <h2 className="mb-3 text-lg font-semibold">Add Game</h2>
        <form action={addGameAction} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="name"
            placeholder="Game name"
            className="w-full rounded border px-3 py-2"
          />
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            Add Game
          </button>
        </form>
        {addError ? <p className="mt-2 text-sm text-red-600">{addError}</p> : null}
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-3 text-lg font-semibold">Game List</h2>

        {games.length === 0 ? (
          <p className="text-sm text-gray-600">No games yet.</p>
        ) : (
          <ul className="space-y-3">
            {games.map((game) => (
              <li key={game.id} className="rounded border p-3">
                <p className="mb-2 font-medium">{game.name}</p>
                <div className="flex flex-col gap-2">
                  <form action={togglePlayedAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={game.id} />
                    <input type="hidden" name="played" value={game.played ? "false" : "true"} />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={game.played}
                        onChange={() => {
                          /* server action form submit button handles update */
                        }}
                        readOnly
                      />
                      Played
                    </label>
                    <button type="submit" className="rounded border px-3 py-1 text-sm">
                      Toggle
                    </button>
                  </form>

                  <form action={renameGameAction} className="flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="id" value={game.id} />
                    <input
                      type="text"
                      name="name"
                      defaultValue={game.name}
                      className="w-full rounded border px-3 py-1"
                    />
                    <button type="submit" className="rounded border px-3 py-1 text-sm">
                      Edit
                    </button>
                  </form>

                  <form action={deleteGameAction}>
                    <input type="hidden" name="id" value={game.id} />
                    <button type="submit" className="rounded border px-3 py-1 text-sm text-red-700">
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {listError ? <p className="mt-3 text-sm text-red-600">{listError}</p> : null}
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-3 text-lg font-semibold">Random Picker</h2>

        <form action={pickRandomGameAction} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="preferUnplayed" defaultChecked={preferUnplayed} />
            Prefer unplayed
          </label>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">
            Pick a Random Game
          </button>
        </form>

        {games.length === 0 ? <p className="text-sm text-gray-600">Add some games first.</p> : null}

        {pickerNote ? <p className="mb-2 text-sm text-amber-700">{pickerNote}</p> : null}

        <div className="rounded border p-3">
          <p className="text-sm text-gray-600">Selected game</p>
          <p className="text-lg font-semibold">{pickedGame ? pickedGame.name : "—"}</p>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <form action={markAsPlayedAction}>
            <input type="hidden" name="id" value={pickedGame?.id ?? ""} />
            <input type="hidden" name="preferUnplayed" value={preferUnplayed ? "1" : "0"} />
            <button
              type="submit"
              disabled={!pickedGame}
              className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark as Played
            </button>
          </form>

          <form action={pickRandomGameAction}>
            <input type="hidden" name="preferUnplayed" value={preferUnplayed ? "on" : ""} />
            <button
              type="submit"
              className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={games.length === 0}
            >
              Pick Again
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
