import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { envBoolSchema } from "../shared/featureFlags";

const optionalSessionSecretSchema = z.preprocess(
	(val) => (val === "" ? undefined : val),
	z.string().min(1).optional(),
);

export const env = createEnv({
	server: {
		PORT: z.coerce.number().default(7777),
		DB_PATH: z.string().default("/data/snippaste.db"),
		FEATURE_QR_CODE: envBoolSchema,
		FEATURE_LANGUAGE_SWITCHER: envBoolSchema,
		FEATURE_AUTO_SAVE: envBoolSchema,
		FEATURE_PASSWORD_PROTECTION: envBoolSchema,
		SESSION_SECRET: optionalSessionSecretSchema,
	},
	runtimeEnv: process.env,
});
