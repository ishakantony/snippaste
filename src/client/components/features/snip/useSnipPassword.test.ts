import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTOSAVE_STATUS } from "@/client/autosaveController";
import { useSnipPassword } from "@/client/components/features/snip/useSnipPassword";
import { useSnipSessionStore } from "@/client/stores/snipSessionStore";

if (typeof window === "undefined") {
	(globalThis as Record<string, unknown>).window = {
		location: { origin: "http://localhost" },
	};
}

import { apiClient } from "@/client/api/client";

vi.mock("@/client/api/client.js", () => ({
	apiClient: {
		api: {
			snips: {
				":slug": {
					unlock: {
						$post: vi.fn(),
					},
					password: {
						$put: vi.fn(),
						$delete: vi.fn(),
					},
					lock: {
						$post: vi.fn(),
					},
					$get: vi.fn(),
				},
			},
		},
	},
}));

describe("useSnipPassword", () => {
	beforeEach(() => {
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

	it("unlocks successfully and calls onUnlock", async () => {
		const onUnlock = vi.fn();
		const setInitialPassword = vi.fn();
		const mockUnlock = apiClient.api.snips[":slug"].unlock.$post as ReturnType<
			typeof vi.fn
		>;
		mockUnlock.mockResolvedValue({ ok: true, status: 200 });

		const { result } = renderHook(() =>
			useSnipPassword("test-slug", { onUnlock, setInitialPassword }),
		);

		act(() => {
			result.current.setUnlockPassword("secret123");
		});

		await act(async () => {
			await result.current.handleUnlock();
		});

		expect(mockUnlock).toHaveBeenCalledWith({
			param: { slug: "test-slug" },
			json: { password: "secret123" },
		});
		expect(result.current.unlockError).toBeNull();
		expect(result.current.unlockPassword).toBe("");
		expect(onUnlock).toHaveBeenCalled();
	});

	it("shows error on unlock failure", async () => {
		const onUnlock = vi.fn();
		const setInitialPassword = vi.fn();
		const mockUnlock = apiClient.api.snips[":slug"].unlock.$post as ReturnType<
			typeof vi.fn
		>;
		mockUnlock.mockResolvedValue({ ok: false, status: 401 });

		const { result } = renderHook(() =>
			useSnipPassword("test-slug", { onUnlock, setInitialPassword }),
		);

		act(() => {
			result.current.setUnlockPassword("wrong");
		});

		await act(async () => {
			await result.current.handleUnlock();
		});

		expect(result.current.unlockError).toBe(
			"Incorrect password or unlock failed.",
		);
		expect(onUnlock).not.toHaveBeenCalled();
	});

	it("shows rate-limit error on 429", async () => {
		const onUnlock = vi.fn();
		const setInitialPassword = vi.fn();
		const mockUnlock = apiClient.api.snips[":slug"].unlock.$post as ReturnType<
			typeof vi.fn
		>;
		mockUnlock.mockResolvedValue({ ok: false, status: 429 });

		const { result } = renderHook(() =>
			useSnipPassword("test-slug", { onUnlock, setInitialPassword }),
		);

		act(() => {
			result.current.setUnlockPassword("wrong");
		});

		await act(async () => {
			await result.current.handleUnlock();
		});

		expect(result.current.unlockError).toBe("Too many attempts. Please wait.");
	});
});
