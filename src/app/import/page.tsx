import { ImportClient } from "./import-client";

export default function ImportPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-8">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-black tracking-tight text-[#3b2b1d] md:text-5xl">🌍 Import from BoardGameGeek</h1>
      </header>

      <ImportClient />
    </main>
  );
}
