import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";

const STORAGE_KEY = "snip-lang";

function detectLanguage(): string {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored && stored in { en: 1 }) return stored;
	const browser = navigator.language.split("-")[0];
	if (browser in { en: 1 }) return browser;
	return "en";
}

i18n.use(initReactI18next).init({
	resources: { en: { translation: en } },
	lng: detectLanguage(),
	fallbackLng: "en",
	interpolation: { escapeValue: false },
});

export { STORAGE_KEY };
export default i18n;
