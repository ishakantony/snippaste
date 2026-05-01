export interface SnipEvent {
  content: string;
  updatedAt: number;
  clientId?: string;
}

type Listener = (event: SnipEvent) => void;

const listenersBySlug = new Map<string, Set<Listener>>();

export function subscribe(slug: string, listener: Listener): () => void {
  let listeners = listenersBySlug.get(slug);
  if (!listeners) {
    listeners = new Set();
    listenersBySlug.set(slug, listeners);
  }
  listeners.add(listener);

  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) {
      listenersBySlug.delete(slug);
    }
  };
}

export function publish(slug: string, event: SnipEvent): void {
  const listeners = listenersBySlug.get(slug);
  if (!listeners) return;

  for (const listener of listeners) {
    listener(event);
  }
}
