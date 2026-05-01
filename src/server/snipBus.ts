// In-process pub/sub bus for real-time snippet sync
// No persistence; listeners removed on disconnect.

export interface SnipEvent {
  content: string;
  updatedAt: number;
  clientId?: string;
}

const bus = new Map<string, Set<(event: SnipEvent) => void>>();

export function subscribe(
  slug: string,
  listener: (event: SnipEvent) => void
): () => void {
  let set = bus.get(slug);
  if (!set) {
    set = new Set();
    bus.set(slug, set);
  }
  set.add(listener);

  return () => {
    set!.delete(listener);
    if (set!.size === 0) {
      bus.delete(slug);
    }
  };
}

export function publish(slug: string, event: SnipEvent): void {
  const set = bus.get(slug);
  if (!set) return;
  for (const listener of set) {
    listener(event);
  }
}
