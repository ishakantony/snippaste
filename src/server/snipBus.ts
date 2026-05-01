export interface SnipUpdate {
	content: string;
	updatedAt: number;
	clientId?: string;
}

export type SnipUpdateListener = (update: SnipUpdate) => void;

export class SnipBus {
	private listeners = new Map<string, Set<SnipUpdateListener>>();

	subscribe(slug: string, listener: SnipUpdateListener): () => void {
		let set = this.listeners.get(slug);
		if (!set) {
			set = new Set();
			this.listeners.set(slug, set);
		}
		set.add(listener);
		return () => {
			const s = this.listeners.get(slug);
			if (!s) return;
			s.delete(listener);
			if (s.size === 0) this.listeners.delete(slug);
		};
	}

	publish(slug: string, update: SnipUpdate): void {
		const set = this.listeners.get(slug);
		if (!set) return;
		for (const l of set) l(update);
	}
}
