import { useCallback, useEffect, useRef, useState } from "react";
import type { Runtime, RuntimeEventType } from "@uiprotocol/core";
import type { EventLogEntry } from "../types";

export function useEvents(
  runtime: Runtime,
  filter?: RuntimeEventType[],
  maxEntries = 200
) {
  const [entries, setEntries] = useState<EventLogEntry[]>([]);
  const entriesRef = useRef<EventLogEntry[]>([]);

  const addEntry = useCallback(
    (type: string, payload: unknown) => {
      if (filter && !filter.includes(type as RuntimeEventType)) {
        return;
      }
      const entry: EventLogEntry = { type, payload, timestamp: Date.now() };
      entriesRef.current = [...entriesRef.current.slice(-maxEntries + 1), entry];
      setEntries(entriesRef.current);
    },
    [filter, maxEntries]
  );

  useEffect(() => {
    const unsubs = [
      runtime.events.on("command", (cmd) => addEntry("command", cmd)),
      runtime.events.on("command:before", (cmd) => addEntry("command:before", cmd)),
      runtime.events.on("trust:blocked", (cmd, reason) =>
        addEntry("trust:blocked", { command: cmd, reason })
      ),
      runtime.events.on("error", (diag) => addEntry("error", diag)),
      runtime.events.on("warning", (diag) => addEntry("warning", diag))
    ];

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [runtime, addEntry]);

  return entries;
}
