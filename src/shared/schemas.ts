import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 256;

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
	password: z
		.string()
		.min(PASSWORD_MIN_LENGTH)
		.max(PASSWORD_MAX_LENGTH)
		.optional(),
});

export type SnipPutBody = z.infer<typeof snipPutBodySchema>;

export const passwordBodySchema = z.object({
	password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export type PasswordBody = z.infer<typeof passwordBodySchema>;
