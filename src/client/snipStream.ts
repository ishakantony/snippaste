export interface SnipUpdate {
  content: string;
  updatedAt: number;
  clientId?: string;
}

export interface SnipStreamHandlers {
  onUpdate: (update: SnipUpdate) => void;
  onSnapshot: (snapshot: SnipUpdate) => void;
  onError?: () => void;
}

export function subscribe(
  slug: string,
  handlers: SnipStreamHandlers
): () => void {
  const url = `/api/snips/${encodeURIComponent(slug)}/events`;
  const es = new EventSource(url);

  es.addEventListener("snapshot", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      handlers.onSnapshot(data);
    } catch {
      // ignore malformed
    }
  });

  es.addEventListener("update", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data);
      handlers.onUpdate(data);
    } catch {
      // ignore malformed
    }
  });

  es.addEventListener("error", () => {
    handlers.onError?.();
  });

  return () => {
    es.close();
  };
}
