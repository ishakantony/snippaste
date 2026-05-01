export interface SnipStreamEvent {
  content: string;
  updatedAt: number;
  clientId?: string;
}

export interface SnipStreamCallbacks {
  onSnapshot: (data: SnipStreamEvent) => void;
  onUpdate: (data: SnipStreamEvent) => void;
  onError: () => void;
}

export function subscribeSnipStream(
  slug: string,
  callbacks: SnipStreamCallbacks
): () => void {
  const url = `/api/snips/${encodeURIComponent(slug)}/events`;
  let es: EventSource | null = new EventSource(url);
  let closed = false;

  es.addEventListener("snapshot", (e) => {
    if (closed) return;
    const data = JSON.parse((e as MessageEvent).data) as SnipStreamEvent;
    callbacks.onSnapshot(data);
  });

  es.addEventListener("update", (e) => {
    if (closed) return;
    const data = JSON.parse((e as MessageEvent).data) as SnipStreamEvent;
    callbacks.onUpdate(data);
  });

  es.onerror = () => {
    if (closed) return;
    callbacks.onError();
  };

  return () => {
    closed = true;
    if (es) {
      es.close();
      es = null;
    }
  };
}
