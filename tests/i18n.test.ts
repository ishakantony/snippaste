import { describe, expect, it } from "vitest";
import en from "@/client/i18n/locales/en.json";
import id from "@/client/i18n/locales/id.json";
import zh from "@/client/i18n/locales/zh.json";

type TranslationValue = string | { [key: string]: TranslationValue };
type Translations = { [key: string]: TranslationValue };

function collectKeys(obj: Translations, prefix = ""): string[] {
	const keys: string[] = [];
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === "string") {
			keys.push(path);
		} else {
			keys.push(...collectKeys(value as Translations, path));
		}
	}
	return keys;
}

function collectInterpolations(obj: Translations): Map<string, string[]> {
	const result = new Map<string, string[]>();
	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === "string") {
			const matches = value.matchAll(/\{\{(\w+)}}/g);
			const vars = [...matches].map((m) => m[1]);
			if (vars.length > 0) result.set(key, vars);
		} else {
			const nested = collectInterpolations(value as Translations);
			for (const [k, v] of nested) result.set(`${key}.${k}`, v);
		}
	}
	return result;
}

describe("i18n locale files", () => {
	const locales: [string, Translations][] = [
		["en", en],
		["zh", zh],
		["id", id],
	];
	const enKeys = new Set(collectKeys(en));

	it("each locale has the same keys as en.json", () => {
		for (const [code, locale] of locales) {
			const keys = new Set(collectKeys(locale));
			const missing = [...enKeys].filter((k) => !keys.has(k));
			const extra = [...keys].filter((k) => !enKeys.has(k));
			expect(missing, `[${code}] missing keys`).toEqual([]);
			expect(extra, `[${code}] extra keys`).toEqual([]);
		}
	});

	it("no empty string values in any locale", () => {
		for (const [code, locale] of locales) {
			const keys = collectKeys(locale);
			for (const key of keys) {
				const parts = key.split(".");
				let value: TranslationValue = locale;
				for (const part of parts) {
					value = (value as Translations)[part];
				}
				expect(value, `[${code}] empty value at ${key}`).not.toBe("");
			}
		}
	});

	it("interpolation variables are preserved across all locales", () => {
		const enInterpolations = collectInterpolations(en);
		for (const [code, locale] of locales) {
			const localeInterpolations = collectInterpolations(locale);
			for (const [key, vars] of enInterpolations) {
				const localeVars = localeInterpolations.get(key);
				expect(
					localeVars,
					`[${code}] missing interpolation at ${key}`,
				).toBeDefined();
				expect(
					localeVars,
					`[${code}] interpolation mismatch at ${key}`,
				).toEqual(expect.arrayContaining(vars));
			}
		}
	});
});
