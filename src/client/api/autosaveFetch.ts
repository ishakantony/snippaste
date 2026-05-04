import type { FetchLike } from "../autosaveController";
import type { ApiClient } from "./client";

export function createAutosaveFetch(
	slug: string,
	client: ApiClient,
): FetchLike {
	return async (_url: string, init: RequestInit) => {
		const body = JSON.parse(init.body as string) as {
			content: string;
			clientId?: string;
			password?: string;
		};
		return client.api.snips[":slug"].$put({
			param: { slug },
			json: body,
		});
	};
}
