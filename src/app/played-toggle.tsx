"use client";

import { useRef } from "react";
import { togglePlayedAction } from "./actions";

type PlayedToggleProps = {
  id: number;
  played: boolean;
};

export function PlayedToggle({ id, played }: PlayedToggleProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={togglePlayedAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="played" value={played ? "false" : "true"} />
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#3b2b1d]">
        <input
          type="checkbox"
          checked={played}
          className="h-4 w-4 accent-[#4caf50]"
          onChange={() => {
            formRef.current?.requestSubmit();
          }}
        />
        Played
      </label>
    </form>
  );
}
