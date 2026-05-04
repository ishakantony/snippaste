import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Set up window before module evaluation
if (typeof window === "undefined") {
	(globalThis as Record<string, unknown>).window = {
		location: { origin: "http://localhost" },
	};
}

import { apiClient } from "@/client/api/client.js";
import { AUTOSAVE_STATUS } from "@/client/autosaveController.js";
import { useSnipSession } from "@/client/components/features/snip/useSnipSession.js";
import type { SnipStreamHandlers } from "@/client/snipStream.js";
import { useSnipSessionStore } from "@/client/stores/snipSessionStore.js";

const mockSubscribe = vi.fn(() => () => {});
let mockControllerState = { status: "idle" };

vi.mock("@/client/api/client.js", () => ({
	apiClient: {
		api: {
			snips: {
				":slug": {
					$get: vi.fn(),
				},
			},
		},
	},
}));

vi.mock("@/client/autosaveController.js", () => ({
	AUTOSAVE_STATUS: {
		IDLE: "idle",
		DIRTY: "dirty",
		SAVING: "saving",
		SAVED: "saved",
		OFFLINE: "offline",
		TOO_LARGE: "too_large",
		LOCKED: "locked",
	},
	AutosaveController: class {
		subscribe = mockSubscribe;
		getState() {
			return mockControllerState;
		}
		onChange() {}
		flush() {}
		setInitialPassword() {}
	},
}));

let capturedSseHandlers: SnipStreamHandlers | null = null;

vi.mock("@/client/snipStream.js", () => ({
	subscribe: vi.fn((_slug: string, handlers: SnipStreamHandlers) => {
		capturedSseHandlers = handlers;
		return () => {};
	}),
}));

vi.mock("@/client/clientId.js", () => ({
	getClientId: () => "test-client-id",
}));

vi.mock("@/client/api/autosaveFetch.js", () => ({
	createAutosaveFetch: () => () => Promise.resolve({ ok: true, status: 200 }),
}));

describe("useSnipSession", () => {
	beforeEach(() => {
		mockControllerState = { status: "idle" };
		capturedSseHandlers = null;
		useSnipSessionStore.setState({
			activeSlug: null,
			loadError: false,
			saveState: { status: AUTOSAVE_STATUS.IDLE },
			remoteChanged: false,
			updatedAt: undefined,
			isLocked: false,
			isProtected: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("fetches initial content and calls onRemoteContent on 200", async () => {
		const onRemoteContent = vi.fn();
		const mockGet = apiClient.api.snips[":slug"].$get as ReturnType<
			typeof vi.fn
		>;
		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({
					content: "hello world",
					updatedAt: 123456,
					protected: false,
				}),
		});

		const { result } = renderHook(() =>
			useSnipSession("test-slug", {
				autoSaveActive: true,
				onRemoteContent,
			}),
		);

		await waitFor(() =>
			expect(onRemoteContent).toHaveBeenCalledWith("hello world"),
		);
		expect(result.current.isLocked).toBe(false);
		expect(result.current.loadError).toBe(false);
		expect(result.current.updatedAt).toBe(123456);
	});

	it("handles 404 as new snip without error", async () => {
		const onRemoteContent = vi.fn();
		const mockGet = apiClient.api.snips[":slug"].$get as ReturnType<
			typeof vi.fn
		>;
		mockGet.mockResolvedValue({
			ok: false,
			status: 404,
		});

		const { result } = renderHook(() =>
			useSnipSession("new-slug", {
				autoSaveActive: true,
				onRemoteContent,
			}),
		);

		await waitFor(() => expect(mockGet).toHaveBeenCalled());
		expect(result.current.loadError).toBe(false);
		expect(onRemoteContent).not.toHaveBeenCalled();
	});

	it("handles 401 by setting locked state", async () => {
		const onRemoteContent = vi.fn();
		const mockGet = apiClient.api.snips[":slug"].$get as ReturnType<
			typeof vi.fn
		>;
		mockGet.mockResolvedValue({
			ok: false,
			status: 401,
		});

		const { result } = renderHook(() =>
			useSnipSession("locked-slug", {
				autoSaveActive: true,
				onRemoteContent,
			}),
		);

		await waitFor(() => expect(result.current.isLocked).toBe(true));
		expect(result.current.loadError).toBe(false);
		expect(onRemoteContent).not.toHaveBeenCalled();
	});

	it("applies remote SSE updates via onRemoteContent when not dirty", async () => {
		const onRemoteContent = vi.fn();
		const mockGet = apiClient.api.snips[":slug"].$get as ReturnType<
			typeof vi.fn
		>;
		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({
					content: "initial",
					updatedAt: 100,
					protected: false,
				}),
		});

		renderHook(() =>
			useSnipSession("test-slug", {
				autoSaveActive: true,
				onRemoteContent,
			}),
		);

		await waitFor(() =>
			expect(onRemoteContent).toHaveBeenCalledWith("initial"),
		);

		// Simulate remote update from another client
		act(() => {
			capturedSseHandlers?.onUpdate?.({
				content: "remote update",
				updatedAt: 200,
				clientId: "other-client",
			});
		});

		await waitFor(() =>
			expect(onRemoteContent).toHaveBeenCalledWith("remote update"),
		);
	});

	it("sets remoteChanged flag instead of applying update when locally dirty", async () => {
		const onRemoteContent = vi.fn();
		const mockGet = apiClient.api.snips[":slug"].$get as ReturnType<
			typeof vi.fn
		>;
		mockGet.mockResolvedValue({
			ok: true,
			status: 200,
			json: () =>
				Promise.resolve({
					content: "initial",
					updatedAt: 100,
					protected: false,
				}),
		});

		const { result } = renderHook(() =>
			useSnipSession("test-slug", {
				autoSaveActive: true,
				onRemoteContent,
			}),
		);

		await waitFor(() =>
			expect(onRemoteContent).toHaveBeenCalledWith("initial"),
		);

		// Simulate dirty state
		mockControllerState = { status: AUTOSAVE_STATUS.DIRTY };

		act(() => {
			capturedSseHandlers?.onUpdate?.({
				content: "remote update",
				updatedAt: 200,
				clientId: "other-client",
			});
		});

		await waitFor(() => expect(result.current.remoteChanged).toBe(true));
		expect(onRemoteContent).not.toHaveBeenCalledWith("remote update");
	});
});
