type SnipEvent = {
  content: string;
  updatedAt: number;
  clientId?: string;
};

type Listener = (event: SnipEvent) => void;

const listenersBySlug = new Map<string, Set<Listener>>();

export const snipBus = {
  subscribe(slug: string, listener: Listener): () => void {
    let set = listenersBySlug.get(slug);
    if (!set) {
      set = new Set();
      listenersBySlug.set(slug, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) {
        listenersBySlug.delete(slug);
      }
    };
  },

  publish(slug: string, event: SnipEvent): void {
    const set = listenersBySlug.get(slug);
    if (!set) return;
    for (const listener of set) {
      listener(event);
    }
  },

  listenerCount(slug: string): number {
    return listenersBySlug.get(slug)?.size ?? 0;
  },

  _reset(): void {
    listenersBySlug.clear();
  },
};
