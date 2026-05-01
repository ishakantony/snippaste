export interface SnipStreamEvent {
  content: string;
  updatedAt: number;
  clientId?: string;
}

export interface SnipStreamHandlers {
  onSnapshot?: (event: SnipStreamEvent) => void;
  onUpdate?: (event: SnipStreamEvent) => void;
  onError?: () => void;
}

function parseEvent(event: MessageEvent<string>): SnipStreamEvent | null {
  try {
    return JSON.parse(event.data) as SnipStreamEvent;
  } catch {
    return null;
  }
}

export function subscribeToSnip(slug: string, handlers: SnipStreamHandlers): () => void {
  const source = new EventSource(`/api/snips/${encodeURIComponent(slug)}/events`);

  source.addEventListener("snapshot", (event) => {
    const parsed = parseEvent(event as MessageEvent<string>);
    if (parsed) handlers.onSnapshot?.(parsed);
  });

  source.addEventListener("update", (event) => {
    const parsed = parseEvent(event as MessageEvent<string>);
    if (parsed) handlers.onUpdate?.(parsed);
  });

  source.onerror = () => {
    handlers.onError?.();
  };

  return () => source.close();
}
