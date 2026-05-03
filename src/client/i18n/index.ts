import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import id from "./locales/id.json";
import zh from "./locales/zh.json";

export const STORAGE_KEY = "snip-lang";

export const SUPPORTED_LANGUAGES = { en: 1, zh: 1, id: 1 } as const;
export type Language = keyof typeof SUPPORTED_LANGUAGES;

export function isSupportedLanguage(value: string): value is Language {
	return value in SUPPORTED_LANGUAGES;
}

export function parseStoredLanguage(raw: string | null): Language | null {
	if (!raw) return null;
	if (isSupportedLanguage(raw)) return raw;

	try {
		const parsed = JSON.parse(raw) as { state?: { language?: unknown } };
		const language = parsed.state?.language;
		return typeof language === "string" && isSupportedLanguage(language)
			? language
			: null;
	} catch {
		return null;
	}
}

export function detectLanguage(): Language {
	const stored = parseStoredLanguage(localStorage.getItem(STORAGE_KEY));
	if (stored) return stored;
	const browser = navigator.language.split("-")[0];
	if (isSupportedLanguage(browser)) return browser;
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
export default i18n;
