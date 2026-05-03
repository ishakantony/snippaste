import { afterEach, describe, expect, it, vi } from "vitest";
import i18n, {
	detectLanguage,
	parseStoredLanguage,
	STORAGE_KEY,
} from "@/client/i18n/index.js";
import {
	bootstrapLanguageStore,
	useLanguageStore,
} from "@/client/stores/languageStore.js";

describe("language store", () => {
	afterEach(() => {
		localStorage.clear();
		useLanguageStore.setState({ language: "en" });
		vi.restoreAllMocks();
	});

	it("defaults to detected English when storage is empty", async () => {
		await useLanguageStore.persist.rehydrate();

		expect(useLanguageStore.getState().language).toBe("en");
	});

	it("detects raw stored language values", () => {
		localStorage.setItem(STORAGE_KEY, "zh");

		expect(detectLanguage()).toBe("zh");
	});

	it("detects Zustand JSON stored language values", () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ state: { language: "id" }, version: 0 }),
		);

		expect(detectLanguage()).toBe("id");
	});

	it("ignores malformed stored language values", () => {
		expect(parseStoredLanguage("not-json")).toBeNull();
		expect(
			parseStoredLanguage(JSON.stringify({ state: { language: "fr" } })),
		).toBeNull();
	});

	it("syncs rehydrated language to i18n through bootstrap", async () => {
		const changeLanguage = vi.spyOn(i18n, "changeLanguage");
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ state: { language: "id" }, version: 0 }),
		);

		await useLanguageStore.persist.rehydrate();
		bootstrapLanguageStore();

		expect(useLanguageStore.getState().language).toBe("id");
		expect(changeLanguage).toHaveBeenCalledWith("id");
	});

	it("changes language, syncs i18n through bootstrap, and persists to storage", () => {
		bootstrapLanguageStore();
		const changeLanguage = vi.spyOn(i18n, "changeLanguage");

		useLanguageStore.getState().setLanguage("zh");

		expect(useLanguageStore.getState().language).toBe("zh");
		expect(changeLanguage).toHaveBeenCalledWith("zh");
		expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
			state: { language: "zh" },
			version: 0,
		});
	});
});
