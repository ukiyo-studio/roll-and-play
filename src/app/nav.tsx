"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function navClass(active: boolean): string {
  return active
    ? "rounded-full bg-[#3a7ca5] px-3 py-1 text-sm font-semibold text-white"
    : "rounded-full bg-[#fff9f1] px-3 py-1 text-sm font-semibold text-[#3b2b1d]";
}

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-10 border-b border-[#d7c5ad] bg-[#e8d8c3]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-3 md:px-8">
        <Link href="/" className={navClass(pathname === "/")}>🎲 Roll &amp; Play</Link>
        <Link href="/tiers" className={navClass(pathname === "/tiers")}>🏆 Tier List</Link>
      </div>
    </nav>
  );
}
