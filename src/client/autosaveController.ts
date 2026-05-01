// AutosaveController — framework-agnostic state machine
// States: Idle | Dirty | Saving | Saved | Offline
// All side-effectful dependencies are injected for testability.

export type AutosaveState =
  | { status: "idle" }
  | { status: "dirty" }
  | { status: "saving" }
  | { status: "saved"; timestamp: number }
  | { status: "offline" }
  | { status: "too_large" };

export type FetchLike = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number }>;
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
  /** Optional client id to include in PUT body for SSE self-echo filtering */
  clientId?: string;
}

export class AutosaveController {
  private state: AutosaveState = { status: "idle" };
  private listeners: Array<(state: AutosaveState) => void> = [];
  private debounceTimer: number | null = null;
  private pendingText: string | null = null;
  private latestText = "";

  private readonly fetch: FetchLike;
  private readonly setTimeout: SetTimeoutLike;
  private readonly clearTimeout: ClearTimeoutLike;
  private readonly dateNow: () => number;
  private readonly url: string;
  private readonly debounceMs: number;
  private readonly clientId: string | undefined;

  constructor(deps: AutosaveControllerDeps) {
    this.fetch = deps.fetch;
    this.setTimeout = deps.setTimeout;
    this.clearTimeout = deps.clearTimeout;
    this.dateNow = deps.dateNow;
    this.url = deps.url;
    this.debounceMs = deps.debounceMs ?? 800;
    this.clientId = deps.clientId;
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

  onChange(text: string): void {
    this.latestText = text;

    const s = this.state.status;

    if (s === "idle" || s === "dirty" || s === "saved" || s === "offline" || s === "too_large") {
      // Reset/start debounce timer
      if (this.debounceTimer !== null) {
        this.clearTimeout(this.debounceTimer ?? undefined);
        this.debounceTimer = null;
      }
      this.debounceTimer = this.setTimeout(() => {
        this.debounceTimer = null;
        this.startSave(this.latestText);
      }, this.debounceMs);

      if (s !== "dirty") {
        this.setState({ status: "dirty" });
      }
    } else if (s === "saving") {
      // Don't start a new request — store as pending
      this.pendingText = text;
    }
  }

  /** Bypass debounce and save immediately if dirty. */
  flush(): void {
    if (this.debounceTimer !== null) {
      this.clearTimeout(this.debounceTimer ?? undefined);
      this.debounceTimer = null;
    }

    const s = this.state.status;
    if (s === "idle" || s === "dirty" || s === "saved" || s === "offline" || s === "too_large") {
      this.startSave(this.latestText);
    }
  }

  private setState(next: AutosaveState): void {
    this.state = next;
    for (const l of this.listeners) {
      l(next);
    }
  }

  private startSave(text: string): void {
    this.setState({ status: "saving" });

    const body: Record<string, string> = { content: text };
    if (this.clientId !== undefined) {
      body.clientId = this.clientId;
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
        if (!res.ok) {
          this.handleSaveFailure();
          return;
        }
        this.handleSaveSuccess();
      },
      () => {
        this.handleSaveFailure();
      }
    );
  }

  private handleSaveSuccess(): void {
    const pending = this.pendingText;
    this.pendingText = null;

    if (pending !== null) {
      // There was a change while saving — save the pending content immediately
      this.startSave(pending);
    } else {
      this.setState({ status: "saved", timestamp: this.dateNow() });
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

    this.setState({ status: "offline" });
  }

  private handlePayloadTooLarge(): void {
    const pending = this.pendingText;
    this.pendingText = null;

    if (pending !== null) {
      this.latestText = pending;
    }

    this.setState({ status: "too_large" });
  }
}
