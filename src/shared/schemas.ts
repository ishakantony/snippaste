import { z } from "zod";

export const slugSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(1, "slug must not be empty")
	.max(64, "slug must be at most 64 characters")
	.regex(
		/^[a-z0-9-]+$/,
		"slug may only contain lowercase letters, digits, and hyphens",
	);

export const snipPutBodySchema = z.object({
	content: z.string(),
	clientId: z.string().min(1).max(64).optional(),
});

export type SnipPutBody = z.infer<typeof snipPutBodySchema>;
