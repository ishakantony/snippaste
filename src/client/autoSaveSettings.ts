export const STORAGE_KEY = "snip-autosave";

export interface AutoSaveStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export function loadAutoSave(storage: AutoSaveStorage): boolean {
	const raw = storage.getItem(STORAGE_KEY);
	if (raw === "true") return true;
	return false;
}

export function saveAutoSave(storage: AutoSaveStorage, enabled: boolean): void {
	storage.setItem(STORAGE_KEY, String(enabled));
}
