import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { applyTheme, THEME, type Theme } from "@/client/theme";

interface ThemeState {
	theme: Theme;
	toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
	persist(
		(set) => ({
			theme: THEME.DARK,
			toggle: () => {
				set((state) => ({
					theme: state.theme === THEME.DARK ? THEME.LIGHT : THEME.DARK,
				}));
			},
		}),
		{
			name: "snip-theme",
			storage: createJSONStorage(() => window.localStorage),
			partialize: (state) => ({ theme: state.theme }),
		},
	),
);

export function useTheme() {
	return {
		theme: useThemeStore((state) => state.theme),
		toggle: useThemeStore((state) => state.toggle),
	};
}

let themeBootstrapped = false;

export function bootstrapThemeStore() {
	if (themeBootstrapped) return;
	themeBootstrapped = true;

	applyTheme(document.documentElement, useThemeStore.getState().theme);
	useThemeStore.subscribe((state) => {
		applyTheme(document.documentElement, state.theme);
	});
}
