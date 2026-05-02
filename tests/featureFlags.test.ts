import { describe, expect, it } from "vitest";
import {
	type FeatureFlags,
	FLAGS_PLACEHOLDER,
	featureFlagsSchema,
} from "@/shared/featureFlags.js";

describe("featureFlagsSchema", () => {
	it("applies defaults when fields are missing", () => {
		const result = featureFlagsSchema.parse({});
		expect(result).toEqual({
			qrCode: true,
			languageSwitcher: true,
			autoSave: true,
			passwordProtection: true,
		});
	});

	it("accepts explicit true values", () => {
		const result = featureFlagsSchema.parse({
			qrCode: true,
			languageSwitcher: true,
			autoSave: true,
			passwordProtection: true,
		});
		expect(result).toEqual({
			qrCode: true,
			languageSwitcher: true,
			autoSave: true,
			passwordProtection: true,
		});
	});

	it("accepts explicit false values", () => {
		const result = featureFlagsSchema.parse({
			qrCode: false,
			languageSwitcher: false,
			autoSave: false,
			passwordProtection: false,
		});
		expect(result).toEqual({
			qrCode: false,
			languageSwitcher: false,
			autoSave: false,
			passwordProtection: false,
		});
	});

	it("applies partial defaults", () => {
		const result = featureFlagsSchema.parse({ qrCode: false });
		expect(result).toEqual({
			qrCode: false,
			languageSwitcher: true,
			autoSave: true,
			passwordProtection: true,
		});
	});

	it("strips unknown keys", () => {
		const result = featureFlagsSchema.parse({
			qrCode: true,
			unknownFlag: true,
		});
		expect(result).toEqual({
			qrCode: true,
			languageSwitcher: true,
			autoSave: true,
			passwordProtection: true,
		});
		expect("unknownFlag" in result).toBe(false);
	});

	it("infers FeatureFlags type from schema", () => {
		const flags: FeatureFlags = {
			qrCode: true,
			languageSwitcher: false,
			autoSave: true,
			passwordProtection: true,
		};
		expect(flags.qrCode).toBe(true);
		expect(flags.languageSwitcher).toBe(false);
	});
});

describe("FLAGS_PLACEHOLDER injection", () => {
	it("replaces placeholder in HTML shell", () => {
		const html = `<!DOCTYPE html><head><!-- @FLAGS@ --></head><body></body>`;
		const flags: FeatureFlags = {
			qrCode: true,
			languageSwitcher: false,
			autoSave: true,
			passwordProtection: true,
		};
		const result = html.replace(
			FLAGS_PLACEHOLDER,
			`<script>window.__FLAGS__ = ${JSON.stringify(flags)}</script>`,
		);
		expect(result).toBe(
			`<!DOCTYPE html><head><script>window.__FLAGS__ = {"qrCode":true,"languageSwitcher":false,"autoSave":true,"passwordProtection":true}</script></head><body></body>`,
		);
	});

	it("leaves HTML unchanged when placeholder is absent", () => {
		const html = `<!DOCTYPE html><head></head><body></body>`;
		const flags: FeatureFlags = {
			qrCode: true,
			languageSwitcher: true,
			autoSave: true,
			passwordProtection: true,
		};
		const result = html.replace(
			FLAGS_PLACEHOLDER,
			`<script>window.__FLAGS__ = ${JSON.stringify(flags)}</script>`,
		);
		expect(result).toBe(html);
	});

	it("client schema parses injected JSON", () => {
		const flags: FeatureFlags = {
			qrCode: false,
			languageSwitcher: true,
			autoSave: true,
			passwordProtection: false,
		};
		const json = JSON.stringify(flags);
		const parsed = featureFlagsSchema.parse(JSON.parse(json));
		expect(parsed).toEqual(flags);
	});
});
