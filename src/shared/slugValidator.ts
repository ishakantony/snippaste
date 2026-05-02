export type ValidateResult =
	| { ok: true; slug: string }
	| { ok: false; reason: string };

const VALID_SLUG_RE = /^[a-z0-9-]+$/;
const MAX_LENGTH = 64;

export const SlugValidator = {
	validate(input: string): ValidateResult {
		const slug = input.trim().toLowerCase();

		if (slug.length === 0) {
			return { ok: false, reason: "slugEmpty" };
		}

		if (slug.length > MAX_LENGTH) {
			return { ok: false, reason: "slugTooLong" };
		}

		if (!VALID_SLUG_RE.test(slug)) {
			return { ok: false, reason: "slugInvalidChars" };
		}

		return { ok: true, slug };
	},
};
