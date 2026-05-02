import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import id from "./locales/id.json";
import zh from "./locales/zh.json";

const STORAGE_KEY = "snip-lang";

const SUPPORTED_LANGUAGES = { en: 1, zh: 1, id: 1 } as const;

function detectLanguage(): string {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored && stored in SUPPORTED_LANGUAGES) return stored;
	const browser = navigator.language.split("-")[0];
	if (browser in SUPPORTED_LANGUAGES) return browser;
	return "en";
}

i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		zh: { translation: zh },
		id: { translation: id },
	},
	lng: detectLanguage(),
	fallbackLng: "en",
	interpolation: { escapeValue: false },
});

export { STORAGE_KEY };
export default i18n;
