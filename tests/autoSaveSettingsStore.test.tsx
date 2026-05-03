import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
	useAutoSaveSettings,
	useAutoSaveSettingsStore,
} from "@/client/stores/autoSaveSettingsStore.js";

function TestComponent() {
	const { enabled, toggle } = useAutoSaveSettings();
	return (
		<div>
			<span data-testid="status">{enabled ? "on" : "off"}</span>
			<button type="button" onClick={toggle}>
				Toggle
			</button>
		</div>
	);
}

describe("auto-save settings store", () => {
	afterEach(() => {
		localStorage.clear();
		useAutoSaveSettingsStore.setState({ enabled: false });
	});

	it("defaults to false when storage is empty", async () => {
		await useAutoSaveSettingsStore.persist.rehydrate();

		render(<TestComponent />);

		expect(screen.getByTestId("status").textContent).toBe("off");
	});

	it("reads initial value from Zustand JSON storage", async () => {
		localStorage.setItem(
			"snip-autosave",
			JSON.stringify({ state: { enabled: true }, version: 0 }),
		);
		await useAutoSaveSettingsStore.persist.rehydrate();

		render(<TestComponent />);

		expect(screen.getByTestId("status").textContent).toBe("on");
	});

	it("toggles value and persists to storage", async () => {
		await useAutoSaveSettingsStore.persist.rehydrate();
		render(<TestComponent />);

		const button = screen.getByRole("button", { name: /toggle/i });
		await userEvent.click(button);

		expect(screen.getByTestId("status").textContent).toBe("on");
		expect(JSON.parse(localStorage.getItem("snip-autosave") ?? "{}")).toEqual({
			state: { enabled: true },
			version: 0,
		});

		await userEvent.click(button);

		expect(screen.getByTestId("status").textContent).toBe("off");
		expect(JSON.parse(localStorage.getItem("snip-autosave") ?? "{}")).toEqual({
			state: { enabled: false },
			version: 0,
		});
	});
});
