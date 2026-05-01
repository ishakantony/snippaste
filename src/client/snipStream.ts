export interface SnipUpdate {
  content: string;
  updatedAt: number;
  clientId?: string;
}

export interface SnipStreamCallbacks {
  onSnapshot: (update: SnipUpdate) => void;
  onUpdate: (update: SnipUpdate) => void;
  onError?: (err: Event) => void;
}

export function subscribe(slug: string, callbacks: SnipStreamCallbacks): () => void {
  const url = `/api/snips/${encodeURIComponent(slug)}/events`;
  const es = new EventSource(url);

  es.addEventListener("snapshot", (e: MessageEvent) => {
    try {
      callbacks.onSnapshot(JSON.parse(e.data) as SnipUpdate);
    } catch {}
  });

  es.addEventListener("update", (e: MessageEvent) => {
    try {
      callbacks.onUpdate(JSON.parse(e.data) as SnipUpdate);
    } catch {}
  });

  if (callbacks.onError) {
    es.addEventListener("error", callbacks.onError);
  }

  return () => es.close();
}
