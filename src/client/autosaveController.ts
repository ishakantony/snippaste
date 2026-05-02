// AutosaveController — framework-agnostic state machine
// States: Idle | Dirty | Saving | Saved | Offline
// All side-effectful dependencies are injected for testability.

export const AUTOSAVE_STATUS = {
	IDLE: "idle",
	DIRTY: "dirty",
	SAVING: "saving",
	SAVED: "saved",
	OFFLINE: "offline",
	TOO_LARGE: "too_large",
	LOCKED: "locked",
} as const;

export type AutosaveState =
	| { status: typeof AUTOSAVE_STATUS.IDLE }
	| { status: typeof AUTOSAVE_STATUS.DIRTY }
	| { status: typeof AUTOSAVE_STATUS.SAVING }
	| { status: typeof AUTOSAVE_STATUS.SAVED; timestamp: number }
	| { status: typeof AUTOSAVE_STATUS.OFFLINE }
	| { status: typeof AUTOSAVE_STATUS.TOO_LARGE }
	| { status: typeof AUTOSAVE_STATUS.LOCKED };

export type FetchLike = (
	url: string,
	init: RequestInit,
) => Promise<{ ok: boolean; status: number }>;
export type SetTimeoutLike = (fn: () => void, ms: number) => number;
export type ClearTimeoutLike = (id: number | undefined) => void;

export interface AutosaveControllerDeps {
	fetch: FetchLike;
	setTimeout: SetTimeoutLike;
	clearTimeout: ClearTimeoutLike;
	dateNow: () => number;
	/** URL template: the slug-specific endpoint, e.g. /api/snips/my-slug */
	url: string;
	/** Debounce window in ms (default 800) */
	debounceMs?: number;
	/** Optional per-tab identifier; when set, included in every PUT body for self-echo filtering. */
	clientId?: string;
	/** When false, onChange tracks text and sets dirty state but never auto-saves. flush() still works. Default true. */
	enabled?: boolean;
}

export class AutosaveController {
	private state: AutosaveState = { status: AUTOSAVE_STATUS.IDLE };
	private listeners: Array<(state: AutosaveState) => void> = [];
	private debounceTimer: number | null = null;
	private pendingText: string | null = null;
	private pendingInitialPassword: string | null = null;
	private latestText = "";

	private readonly fetch: FetchLike;
	private readonly setTimeout: SetTimeoutLike;
	private readonly clearTimeout: ClearTimeoutLike;
	private readonly dateNow: () => number;
	private readonly url: string;
	private readonly debounceMs: number;
	private readonly clientId: string | undefined;
	private readonly enabled: boolean;

	constructor(deps: AutosaveControllerDeps) {
		this.fetch = deps.fetch;
		this.setTimeout = deps.setTimeout;
		this.clearTimeout = deps.clearTimeout;
		this.dateNow = deps.dateNow;
		this.url = deps.url;
		this.debounceMs = deps.debounceMs ?? 800;
		this.clientId = deps.clientId;
		this.enabled = deps.enabled ?? true;
	}

	/** Bypass the debounce timer and save immediately if dirty. No-op otherwise. */
	flush(): void {
		if (this.state.status !== AUTOSAVE_STATUS.DIRTY) return;
		if (this.debounceTimer !== null) {
			this.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		this.startSave(this.latestText);
	}

	/** Subscribe to state changes. Returns an unsubscribe function. */
	subscribe(listener: (state: AutosaveState) => void): () => void {
		this.listeners.push(listener);
		// Immediately notify with current state
		listener(this.state);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	getState(): AutosaveState {
		return this.state;
	}

	setInitialPassword(password: string | null): void {
		this.pendingInitialPassword = password;
	}

	onChange(text: string): void {
		this.latestText = text;

		const s = this.state.status;

		if (
			s === AUTOSAVE_STATUS.IDLE ||
			s === AUTOSAVE_STATUS.DIRTY ||
			s === AUTOSAVE_STATUS.SAVED ||
			s === AUTOSAVE_STATUS.OFFLINE ||
			s === AUTOSAVE_STATUS.TOO_LARGE ||
			s === AUTOSAVE_STATUS.LOCKED
		) {
			if (this.enabled) {
				// Reset/start debounce timer
				if (this.debounceTimer !== null) {
					this.clearTimeout(this.debounceTimer ?? undefined);
					this.debounceTimer = null;
				}
				this.debounceTimer = this.setTimeout(() => {
					this.debounceTimer = null;
					this.startSave(this.latestText);
				}, this.debounceMs);
			}

			if (s !== AUTOSAVE_STATUS.DIRTY) {
				this.setState({ status: AUTOSAVE_STATUS.DIRTY });
			}
		} else if (s === AUTOSAVE_STATUS.SAVING) {
			// Don't start a new request — store as pending
			this.pendingText = text;
		}
	}

	private setState(next: AutosaveState): void {
		this.state = next;
		for (const l of this.listeners) {
			l(next);
		}
	}

	private startSave(text: string): void {
		this.setState({ status: AUTOSAVE_STATUS.SAVING });

		const body: { content: string; clientId?: string; password?: string } = {
			content: text,
		};
		if (this.clientId !== undefined) body.clientId = this.clientId;
		if (this.pendingInitialPassword !== null) {
			body.password = this.pendingInitialPassword;
		}

		this.fetch(this.url, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}).then(
			(res) => {
				if (res.status === 413) {
					this.handlePayloadTooLarge();
					return;
				}
				if (res.status === 401) {
					this.handleLocked();
					return;
				}
				if (!res.ok) {
					this.handleSaveFailure();
					return;
				}
				this.handleSaveSuccess();
			},
			() => {
				this.handleSaveFailure();
			},
		);
	}

	private handleSaveSuccess(): void {
		const pending = this.pendingText;
		this.pendingText = null;

		if (pending !== null) {
			// There was a change while saving — save the pending content immediately
			this.startSave(pending);
		} else {
			this.pendingInitialPassword = null;
			this.setState({
				status: AUTOSAVE_STATUS.SAVED,
				timestamp: this.dateNow(),
			});
		}
	}

	private handleSaveFailure(): void {
		const pending = this.pendingText;
		this.pendingText = null;

		if (pending !== null) {
			// Transition to offline but also queue the pending text for next change
			// Per spec: offline → next onChange re-triggers; we store pending as latestText
			this.latestText = pending;
		}

		this.setState({ status: AUTOSAVE_STATUS.OFFLINE });
	}

	private handlePayloadTooLarge(): void {
		const pending = this.pendingText;
		this.pendingText = null;

		if (pending !== null) {
			this.latestText = pending;
		}

		this.setState({ status: AUTOSAVE_STATUS.TOO_LARGE });
	}

	private handleLocked(): void {
		const pending = this.pendingText;
		this.pendingText = null;

		if (pending !== null) {
			this.latestText = pending;
		}

		this.setState({ status: AUTOSAVE_STATUS.LOCKED });
	}
}
