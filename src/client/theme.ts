export const THEME = {
	LIGHT: "light",
	DARK: "dark",
} as const;

export type Theme = typeof THEME.LIGHT | typeof THEME.DARK;

const STORAGE_KEY = "snip-theme";

export interface ThemeStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export function loadTheme(storage: ThemeStorage): Theme {
	const raw = storage.getItem(STORAGE_KEY);
	if (raw === THEME.LIGHT || raw === THEME.DARK) return raw;
	return THEME.DARK;
}

export function saveTheme(storage: ThemeStorage, theme: Theme): void {
	storage.setItem(STORAGE_KEY, theme);
}

export function applyTheme(el: HTMLElement, theme: Theme): void {
	el.setAttribute("data-theme", theme);
}
