import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import i18n, {
	detectLanguage,
	type Language,
	STORAGE_KEY,
} from "@/client/i18n/index.js";

interface LanguageState {
	language: Language;
	setLanguage: (language: Language) => void;
}

function syncI18nLanguage(language: Language) {
	if (i18n.language !== language) {
		i18n.changeLanguage(language);
	}
}

export const useLanguageStore = create<LanguageState>()(
	persist(
		(set) => ({
			language: detectLanguage(),
			setLanguage: (language) => set({ language }),
		}),
		{
			name: STORAGE_KEY,
			storage: createJSONStorage(() => window.localStorage),
			partialize: (state) => ({ language: state.language }),
		},
	),
);

let languageBootstrapped = false;

export function bootstrapLanguageStore() {
	if (languageBootstrapped) return;
	languageBootstrapped = true;

	syncI18nLanguage(useLanguageStore.getState().language);
	useLanguageStore.subscribe((state) => {
		syncI18nLanguage(state.language);
	});
}

export function useLanguage() {
	return {
		language: useLanguageStore((state) => state.language),
		setLanguage: useLanguageStore((state) => state.setLanguage),
	};
}
