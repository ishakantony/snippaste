export interface ExpirationInfo {
	daysRemaining: number;
	text: string;
	color: "green" | "yellow" | "red";
}

export function getExpirationInfo(
	updatedAt: number,
	now: number,
): ExpirationInfo {
	const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
	const remaining = updatedAt + THIRTY_DAYS_MS - now;
	const daysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));

	let color: "green" | "yellow" | "red";
	if (daysRemaining > 7) {
		color = "green";
	} else if (daysRemaining > 3) {
		color = "yellow";
	} else {
		color = "red";
	}

	const text = daysRemaining > 0 ? `${daysRemaining}d left` : "expired";

	return { daysRemaining, text, color };
}
