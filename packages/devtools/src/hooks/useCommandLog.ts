import { useCallback, useEffect, useState } from "react";
import type { Runtime } from "@uiprotocol/core";
import type { CommandLogDisplayEntry } from "../types";

export function useCommandLog(runtime: Runtime, maxEntries = 200) {
  const [entries, setEntries] = useState<CommandLogDisplayEntry[]>([]);

  const refresh = useCallback(() => {
    const all = runtime.commandLog.getAll();
    const sliced = all.length > maxEntries ? all.slice(-maxEntries) : [...all];
    setEntries(sliced);
  }, [runtime, maxEntries]);

  useEffect(() => {
    refresh();
    const unsub = runtime.events.on("command", () => refresh());
    const unsubBlocked = runtime.events.on("trust:blocked", () => refresh());
    return () => {
      unsub();
      unsubBlocked();
    };
  }, [runtime, refresh]);

  return entries;
}
