import { z } from "zod";

export const slugSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(1, "slugEmpty")
	.max(64, "slugTooLong")
	.regex(/^[a-z0-9-]+$/, "slugInvalidChars");

export const snipPutBodySchema = z.object({
	content: z.string(),
	clientId: z.string().min(1).max(64).optional(),
});

export type SnipPutBody = z.infer<typeof snipPutBodySchema>;
