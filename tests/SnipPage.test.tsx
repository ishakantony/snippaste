import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SnipPage } from "@/client/SnipPage.js";
import { useAutoSaveSettingsStore } from "@/client/stores/autoSaveSettingsStore.js";
import {
	initializeFeatureFlags,
	useFeatureFlagsStore,
} from "@/client/stores/featureFlagsStore.js";

const autosaveControllerDeps = vi.hoisted(
	() => [] as Array<{ enabled?: boolean }>,
);

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
		private state = { status: "idle" };

		constructor(deps: { enabled?: boolean }) {
			autosaveControllerDeps.push(deps);
		}

		subscribe(listener: (state: { status: string }) => void) {
			listener(this.state);
			return () => {};
		}

		getState() {
			return this.state;
		}

		onChange() {}

		flush() {}

		setInitialPassword() {}
	},
}));

vi.mock("@/client/snipStream.js", () => ({
	subscribe: vi.fn(() => () => {}),
}));

function renderSnipPage(flags: { autoSave: boolean }) {
	window.__FLAGS__ = {
		qrCode: true,
		languageSwitcher: true,
		autoSave: flags.autoSave,
		passwordProtection: true,
	};
	useFeatureFlagsStore.setState({ initialized: false });
	initializeFeatureFlags();

	render(
		<MemoryRouter initialEntries={["/s/test-snip"]}>
			<Routes>
				<Route path="/s/:name" element={<SnipPage />} />
			</Routes>
		</MemoryRouter>,
	);
}

describe("SnipPage auto-save feature flag", () => {
	afterEach(() => {
		cleanup();
		localStorage.clear();
		useAutoSaveSettingsStore.setState({ enabled: false });
		useFeatureFlagsStore.setState({
			flags: {
				qrCode: true,
				languageSwitcher: true,
				autoSave: true,
				passwordProtection: true,
			},
			initialized: false,
		});
		autosaveControllerDeps.length = 0;
		vi.restoreAllMocks();
	});

	it("disables controller auto-save when the feature flag is off", async () => {
		useAutoSaveSettingsStore.setState({ enabled: true });
		vi.spyOn(globalThis, "fetch").mockResolvedValue({
			ok: false,
			status: 404,
		} as Response);

		renderSnipPage({ autoSave: false });

		await waitFor(() => expect(autosaveControllerDeps).toHaveLength(1));
		expect(autosaveControllerDeps[0].enabled).toBe(false);
	});
});
