export type ValidateResult =
	| { ok: true; slug: string }
	| { ok: false; reason: string };

const VALID_SLUG_RE = /^[a-z0-9-]+$/;
const MAX_LENGTH = 64;

export const SlugValidator = {
	validate(input: string): ValidateResult {
		const slug = input.trim().toLowerCase();

		if (slug.length === 0) {
			return { ok: false, reason: "slug must not be empty" };
		}

		if (slug.length > MAX_LENGTH) {
			return {
				ok: false,
				reason: `slug must be at most ${MAX_LENGTH} characters`,
			};
		}

		if (!VALID_SLUG_RE.test(slug)) {
			return {
				ok: false,
				reason: "slug may only contain lowercase letters, digits, and hyphens",
			};
		}

		return { ok: true, slug };
	},
};
