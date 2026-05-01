export interface BusEvent {
  content: string;
  updatedAt: number;
  clientId?: string;
}

type Listener = (event: BusEvent) => void;

class SnipBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  subscribe(slug: string, listener: Listener): () => void {
    let set = this.listeners.get(slug);
    if (!set) {
      set = new Set();
      this.listeners.set(slug, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(slug);
    };
  }

  publish(slug: string, event: BusEvent): void {
    const set = this.listeners.get(slug);
    if (!set) return;
    for (const listener of set) {
      listener(event);
    }
  }
}

export const snipBus = new SnipBus();
