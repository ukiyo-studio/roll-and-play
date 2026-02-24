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
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={played}
          onChange={() => {
            formRef.current?.requestSubmit();
          }}
        />
        Played
      </label>
    </form>
  );
}
