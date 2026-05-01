export interface SnipUpdate {
  content: string;
  updatedAt: number;
  clientId?: string;
}

export interface SnipStreamHandlers {
  onUpdate(update: SnipUpdate): void;
  onSnapshot(snapshot: SnipUpdate): void;
  onError?(): void;
}

export function subscribe(slug: string, handlers: SnipStreamHandlers): () => void {
  const url = `/api/snips/${encodeURIComponent(slug)}/events`;
  let es: EventSource | null = new EventSource(url);
  let closed = false;

  es.onmessage = () => {
    // no-op; we handle specific events
  };

  es.addEventListener("snapshot", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as SnipUpdate;
      handlers.onSnapshot(data);
    } catch {
      // ignore malformed
    }
  });

  es.addEventListener("update", (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as SnipUpdate;
      handlers.onUpdate(data);
    } catch {
      // ignore malformed
    }
  });

  es.onerror = () => {
    handlers.onError?.();
    if (es && es.readyState === EventSource.CLOSED) {
      // EventSource will auto-reconnect; just notify
    }
  };

  return () => {
    if (closed) return;
    closed = true;
    es?.close();
    es = null;
  };
}
