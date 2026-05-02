import { z } from "zod";

export const envBoolSchema = z.preprocess((val) => {
	if (val === undefined) return true;
	if (typeof val === "boolean") return val;
	return val === "true";
}, z.boolean());

export const featureFlagsSchema = z.object({
	qrCode: z.boolean().default(true),
	languageSwitcher: z.boolean().default(true),
	autoSave: z.boolean().default(true),
});

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;

export const FLAGS_PLACEHOLDER = "<!-- @FLAGS@ -->";
