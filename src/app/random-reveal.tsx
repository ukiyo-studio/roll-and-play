"use client";

import { useEffect, useMemo, useState } from "react";

type RandomRevealProps = {
  gameNames: string[];
  selectedName: string | null;
};

export function RandomReveal({ gameNames, selectedName }: RandomRevealProps) {
  const names = useMemo(() => gameNames.filter(Boolean), [gameNames]);
  const [displayName, setDisplayName] = useState<string>("—");
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (!selectedName || names.length === 0) {
      return;
    }

    const start = window.setTimeout(() => {
      setIsRolling(true);

      let tick = 0;
      const interval = window.setInterval(() => {
        const idx = Math.floor(Math.random() * names.length);
        setDisplayName(names[idx] ?? selectedName);
        tick += 1;

        if (tick >= 8) {
          window.clearInterval(interval);
          setDisplayName(selectedName);
          setIsRolling(false);
        }
      }, 80);
    }, 0);

    return () => {
      window.clearTimeout(start);
    };
  }, [names, selectedName]);

  const finalName = selectedName ? (isRolling ? displayName : selectedName) : "—";

  return (
    <div className="rounded-2xl border border-[#d7c5ad] bg-[#fff9f1] p-6 text-center shadow-md transition">
      <p className="text-sm font-medium text-[#6e5a45]">✨ Tonight&apos;s Game ✨</p>
      <p className={`mt-2 text-3xl font-extrabold text-[#3b2b1d] ${isRolling ? "animate-pulse" : ""}`}>
        {finalName}
      </p>
      {isRolling ? <p className="mt-2 text-sm text-[#8b735a]">🎲 Rolling...</p> : null}
    </div>
  );
}
