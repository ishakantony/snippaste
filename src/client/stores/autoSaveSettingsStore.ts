import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface AutoSaveSettingsState {
	enabled: boolean;
	toggle: () => void;
}

export const useAutoSaveSettingsStore = create<AutoSaveSettingsState>()(
	persist(
		(set) => ({
			enabled: false,
			toggle: () => {
				set((state) => ({ enabled: !state.enabled }));
			},
		}),
		{
			name: "snip-autosave",
			storage: createJSONStorage(() => window.localStorage),
			partialize: (state) => ({ enabled: state.enabled }),
		},
	),
);

export function useAutoSaveSettings() {
	return {
		enabled: useAutoSaveSettingsStore((state) => state.enabled),
		toggle: useAutoSaveSettingsStore((state) => state.toggle),
	};
}
