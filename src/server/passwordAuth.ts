import {
	createHmac,
	randomBytes,
	scryptSync,
	timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString("base64url");
	const hash = scryptSync(password, salt, KEY_LENGTH).toString("base64url");
	return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
	const [algorithm, salt, hash] = encoded.split("$");
	if (algorithm !== "scrypt" || !salt || !hash) return false;
	const actual = Buffer.from(hash, "base64url");
	const expected = scryptSync(password, salt, actual.length);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signUnlockCookie(payload: string, secret: string): string {
	const signature = createHmac("sha256", secret)
		.update(payload)
		.digest("base64url");
	return `${payload}.${signature}`;
}

export function verifyUnlockCookie(
	value: string,
	secret: string,
): string | null {
	const separator = value.lastIndexOf(".");
	if (separator === -1) return null;
	const payload = value.slice(0, separator);
	const expected = signUnlockCookie(payload, secret);
	const actualBuffer = Buffer.from(value);
	const expectedBuffer = Buffer.from(expected);
	if (actualBuffer.length !== expectedBuffer.length) return null;
	return timingSafeEqual(actualBuffer, expectedBuffer) ? payload : null;
}

export function cookieNameForSlug(slug: string): string {
	return `snip_unlock_${slug}`;
}
