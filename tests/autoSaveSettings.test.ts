import { describe, expect, it } from "vitest";
import {
	type AutoSaveStorage,
	loadAutoSave,
	STORAGE_KEY,
	saveAutoSave,
} from "@/client/autoSaveSettings.js";

function makeFakeStorage(
	initial: Record<string, string> = {},
): AutoSaveStorage {
	const store = { ...initial };
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
	};
}

describe("loadAutoSave", () => {
	it("returns false when storage is empty", () => {
		const storage = makeFakeStorage();
		expect(loadAutoSave(storage)).toBe(false);
	});

	it("returns false when storage has invalid value", () => {
		const storage = makeFakeStorage({ [STORAGE_KEY]: "invalid" });
		expect(loadAutoSave(storage)).toBe(false);
	});

	it("returns true when storage has 'true'", () => {
		const storage = makeFakeStorage({ [STORAGE_KEY]: "true" });
		expect(loadAutoSave(storage)).toBe(true);
	});

	it("returns false when storage has 'false'", () => {
		const storage = makeFakeStorage({ [STORAGE_KEY]: "false" });
		expect(loadAutoSave(storage)).toBe(false);
	});
});

describe("saveAutoSave", () => {
	it("saves 'true' to storage", () => {
		const storage = makeFakeStorage();
		saveAutoSave(storage, true);
		expect(storage.getItem(STORAGE_KEY)).toBe("true");
	});

	it("saves 'false' to storage", () => {
		const storage = makeFakeStorage();
		saveAutoSave(storage, false);
		expect(storage.getItem(STORAGE_KEY)).toBe("false");
	});
});
