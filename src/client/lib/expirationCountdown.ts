export interface ExpirationInfo {
	daysRemaining: number;
	isExpired: boolean;
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

	return { daysRemaining, isExpired: daysRemaining <= 0, color };
}
