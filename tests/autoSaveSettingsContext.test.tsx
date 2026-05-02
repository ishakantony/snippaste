import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
	AutoSaveSettingsProvider,
	useAutoSaveSettings,
} from "@/client/autoSaveSettingsContext.js";

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

function makeFakeStorage(initial: Record<string, string> = {}) {
	const store = { ...initial };
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
	};
}

describe("AutoSaveSettingsProvider", () => {
	it("defaults to false when storage is empty", () => {
		const storage = makeFakeStorage();
		render(
			<AutoSaveSettingsProvider storage={storage}>
				<TestComponent />
			</AutoSaveSettingsProvider>,
		);
		expect(screen.getByTestId("status").textContent).toBe("off");
	});

	it("reads initial value from storage", () => {
		const storage = makeFakeStorage({ "snip-autosave": "true" });
		render(
			<AutoSaveSettingsProvider storage={storage}>
				<TestComponent />
			</AutoSaveSettingsProvider>,
		);
		expect(screen.getByTestId("status").textContent).toBe("on");
	});

	it("toggles value and persists to storage", async () => {
		const storage = makeFakeStorage();
		render(
			<AutoSaveSettingsProvider storage={storage}>
				<TestComponent />
			</AutoSaveSettingsProvider>,
		);

		const button = screen.getByRole("button", { name: /toggle/i });
		await userEvent.click(button);

		expect(screen.getByTestId("status").textContent).toBe("on");
		expect(storage.getItem("snip-autosave")).toBe("true");

		await userEvent.click(button);

		expect(screen.getByTestId("status").textContent).toBe("off");
		expect(storage.getItem("snip-autosave")).toBe("false");
	});
});
