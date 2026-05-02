import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		PORT: z.coerce.number().default(7777),
		DB_PATH: z.string().default("/data/snippaste.db"),
	},
	runtimeEnv: process.env,
});
