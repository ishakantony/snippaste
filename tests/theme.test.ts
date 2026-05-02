import { describe, expect, it, vi } from "vitest";
import { applyTheme, loadTheme, saveTheme } from "@/client/theme.js";

function fakeStorage(initial?: Record<string, string>) {
	const data = new Map(Object.entries(initial ?? {}));
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => {
			data.set(k, v);
		},
		removeItem: (k: string) => {
			data.delete(k);
		},
		snapshot: () => Object.fromEntries(data),
	};
}

describe("theme", () => {
	it("loadTheme defaults to 'dark' when storage is empty", () => {
		expect(loadTheme(fakeStorage())).toBe("dark");
	});

	it("loadTheme returns 'light' when stored", () => {
		expect(loadTheme(fakeStorage({ "snip-theme": "light" }))).toBe("light");
	});

	it("loadTheme falls back to 'dark' for invalid stored values", () => {
		expect(loadTheme(fakeStorage({ "snip-theme": "rainbow" }))).toBe("dark");
	});

	it("saveTheme persists to storage under snip-theme", () => {
		const s = fakeStorage();
		saveTheme(s, "light");
		expect(s.snapshot()["snip-theme"]).toBe("light");
	});

	it("applyTheme sets data-theme attribute on the given element", () => {
		const el = { setAttribute: vi.fn() };
		applyTheme(el as unknown as HTMLElement, "light");
		expect(el.setAttribute).toHaveBeenCalledWith("data-theme", "light");
	});
});
