import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import { envBoolSchema } from "../shared/featureFlags.js";

export const env = createEnv({
	server: {
		PORT: z.coerce.number().default(7777),
		DB_PATH: z.string().default("/data/snippaste.db"),
		FEATURE_QR_CODE: envBoolSchema,
		FEATURE_LANGUAGE_SWITCHER: envBoolSchema,
	},
	runtimeEnv: process.env,
});
