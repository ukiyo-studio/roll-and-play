import { importCollectionAction } from "./actions";

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

export default async function ImportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const error = readParam(params, "error");
  const success = readParam(params, "success") === "1";
  const username = readParam(params, "username");
  const imported = Number(readParam(params, "imported") ?? "0");
  const updated = Number(readParam(params, "updated") ?? "0");
  const batches = Number(readParam(params, "batches") ?? "0");

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[#3b2b1d] md:text-5xl">🌍 Import from BoardGameGeek</h1>
      </header>

      <section className="rounded-2xl border border-[#d7c5ad] bg-[#f6f1e9] p-5 shadow-md">
        <form action={importCollectionAction} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="username"
            placeholder="BGG username"
            defaultValue={username ?? ""}
            className="w-full rounded-xl border border-[#d7c5ad] bg-[#fff9f1] px-4 py-3 text-[#3b2b1d] outline-none transition focus:border-[#3a7ca5]"
          />
          <button
            type="submit"
            className="rounded-xl bg-[#3a7ca5] px-5 py-3 font-semibold text-white transition hover:scale-105"
          >
            Import Collection
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-[#d7c5ad] bg-[#fff9f1] p-4 text-sm text-[#6e5a45]">
          <p>Fetching collection…</p>
          <p>Fetching game details (Batch X of Y)…</p>
          <p>Import complete</p>
        </div>

        {success ? (
          <div className="mt-4 rounded-xl border border-[#b5d7bc] bg-[#eef9f0] p-4 text-sm text-[#245433]">
            <p className="font-semibold">Import complete for {username}.</p>
            <p>{imported} games imported.</p>
            <p>{updated} games updated.</p>
            <p>{batches} detail batches processed.</p>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-[#e0b8bb] bg-[#fdeeee] p-4 text-sm text-[#8f2c32]">
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}
