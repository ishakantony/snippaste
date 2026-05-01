export interface SnipUpdateEvent {
	content: string;
	updatedAt: number;
	clientId?: string;
}

export interface SnipSnapshotEvent {
	content: string;
	updatedAt: number;
}

export interface SnipStreamHandlers {
	onUpdate?: (e: SnipUpdateEvent) => void;
	onSnapshot?: (e: SnipSnapshotEvent) => void;
	onError?: () => void;
}

export interface EventSourceLike {
	addEventListener(name: string, fn: (e: { data: string }) => void): void;
	removeEventListener(name: string, fn: (e: { data: string }) => void): void;
	close(): void;
	onerror: (() => void) | null;
}

export interface SubscribeOptions {
	eventSourceFactory?: (url: string) => EventSourceLike;
}

function defaultFactory(url: string): EventSourceLike {
	return new EventSource(url) as unknown as EventSourceLike;
}

export function subscribe(
	slug: string,
	handlers: SnipStreamHandlers,
	options: SubscribeOptions = {},
): () => void {
	const factory = options.eventSourceFactory ?? defaultFactory;
	const url = `/api/snips/${slug}/events`;
	const es = factory(url);

	const onUpdate = (e: { data: string }) => {
		if (!handlers.onUpdate) return;
		try {
			handlers.onUpdate(JSON.parse(e.data) as SnipUpdateEvent);
		} catch {
			/* ignore malformed payloads */
		}
	};

	const onSnapshot = (e: { data: string }) => {
		if (!handlers.onSnapshot) return;
		try {
			handlers.onSnapshot(JSON.parse(e.data) as SnipSnapshotEvent);
		} catch {
			/* ignore */
		}
	};

	es.addEventListener("update", onUpdate);
	es.addEventListener("snapshot", onSnapshot);
	if (handlers.onError) {
		es.onerror = handlers.onError;
	}

	return () => {
		es.removeEventListener("update", onUpdate);
		es.removeEventListener("snapshot", onSnapshot);
		es.close();
	};
}
