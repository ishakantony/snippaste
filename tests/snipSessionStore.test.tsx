import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AUTOSAVE_STATUS } from "@/client/autosaveController.js";
import {
	useSnipSessionDirty,
	useSnipSessionStore,
} from "@/client/stores/snipSessionStore.js";

function DirtyIndicator() {
	const dirty = useSnipSessionDirty();
	return <span data-testid="dirty">{dirty ? "dirty" : "clean"}</span>;
}

describe("snip session store", () => {
	afterEach(() => {
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

	it("starts with an empty active session", () => {
		expect(useSnipSessionStore.getState()).toMatchObject({
			activeSlug: null,
			loadError: false,
			saveState: { status: AUTOSAVE_STATUS.IDLE },
			remoteChanged: false,
			updatedAt: undefined,
			isLocked: false,
			isProtected: false,
		});
	});

	it("resets session values when the active slug changes", () => {
		const store = useSnipSessionStore.getState();

		store.resetForSlug("alpha");
		useSnipSessionStore.getState().setLoadError(true);
		useSnipSessionStore.getState().setSaveState({
			status: AUTOSAVE_STATUS.SAVED,
			timestamp: 123,
		});
		useSnipSessionStore.getState().setRemoteChanged(true);
		useSnipSessionStore.getState().setUpdatedAt(456);
		useSnipSessionStore.getState().setLocked(true);
		useSnipSessionStore.getState().setProtected(true);

		useSnipSessionStore.getState().resetForSlug("alpha");
		expect(useSnipSessionStore.getState()).toMatchObject({
			activeSlug: "alpha",
			loadError: true,
			remoteChanged: true,
			updatedAt: 456,
			isLocked: true,
			isProtected: true,
		});

		useSnipSessionStore.getState().resetForSlug("beta");
		expect(useSnipSessionStore.getState()).toMatchObject({
			activeSlug: "beta",
			loadError: false,
			saveState: { status: AUTOSAVE_STATUS.IDLE },
			remoteChanged: false,
			updatedAt: undefined,
			isLocked: false,
			isProtected: false,
		});
	});

	it("derives dirty state from autosave status", () => {
		render(<DirtyIndicator />);

		expect(screen.getByTestId("dirty").textContent).toBe("clean");

		act(() => {
			useSnipSessionStore
				.getState()
				.setSaveState({ status: AUTOSAVE_STATUS.DIRTY });
		});
		expect(screen.getByTestId("dirty").textContent).toBe("dirty");

		act(() => {
			useSnipSessionStore
				.getState()
				.setSaveState({ status: AUTOSAVE_STATUS.SAVING });
		});
		expect(screen.getByTestId("dirty").textContent).toBe("dirty");

		act(() => {
			useSnipSessionStore
				.getState()
				.setSaveState({ status: AUTOSAVE_STATUS.SAVED, timestamp: 789 });
		});
		expect(screen.getByTestId("dirty").textContent).toBe("clean");
	});
});
