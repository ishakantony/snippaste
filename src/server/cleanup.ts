import { CronJob } from "cron";
import type { SnipStore } from "./store.js";

const MAX_AGE_DAYS = 30;
const CRON_EXPRESSION = "0 3 * * *"; // 3 AM daily

export async function runCleanup(store: SnipStore): Promise<void> {
	try {
		const deleted = store.deleteStale(MAX_AGE_DAYS);
		console.log(
			`[cleanup] Removed ${deleted} stale snip(s) older than ${MAX_AGE_DAYS} days`,
		);
	} catch (error) {
		console.error("[cleanup] Failed to delete stale snips:", error);
	}
}

export function startCleanupJob(store: SnipStore): CronJob {
	const job = CronJob.from({
		cronTime: CRON_EXPRESSION,
		onTick: () => runCleanup(store),
		start: true,
		waitForCompletion: true,
	});

	console.log(
		`[cleanup] Scheduled daily cleanup at ${CRON_EXPRESSION} (server timezone)`,
	);
	return job;
}
