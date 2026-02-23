export type EventHandler<T extends unknown[] = unknown[]> = (...args: T) => void;

export class EventEmitter<
  Events extends { [K in keyof Events]: unknown[] } = Record<string, unknown[]>
> {
  private readonly handlers = new Map<keyof Events, Set<EventHandler>>();

  on<K extends keyof Events>(type: K, handler: EventHandler<Events[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as EventHandler);

    return () => {
      set!.delete(handler as EventHandler);
      if (set!.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  emit<K extends keyof Events>(type: K, ...args: Events[K]): void {
    const set = this.handlers.get(type);
    if (!set) {
      return;
    }
    for (const handler of set) {
      handler(...args);
    }
  }

  off<K extends keyof Events>(type: K, handler: EventHandler<Events[K]>): void {
    const set = this.handlers.get(type);
    if (!set) {
      return;
    }
    set.delete(handler as EventHandler);
    if (set.size === 0) {
      this.handlers.delete(type);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
