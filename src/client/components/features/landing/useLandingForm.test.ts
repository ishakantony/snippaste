import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
	useNavigate: () => mockNavigate,
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/client/slugGenerator.js", () => ({
	SlugGenerator: {
		generate: () => "random-slug",
	},
}));

vi.mock("@/shared/slugValidator.js", () => ({
	SlugValidator: {
		validate: (input: string) => {
			if (input === "valid-slug") {
				return { ok: true, slug: input };
			}
			return { ok: false, reason: "slugInvalidChars" };
		},
	},
}));

describe("useLandingForm", () => {
	beforeEach(() => {
		mockNavigate.mockClear();
	});
	it("generates a slug and navigates when name is empty", async () => {
		const { useLandingForm } = await import(
			"@/client/components/features/landing/useLandingForm.js"
		);
		const { result } = renderHook(() => useLandingForm());

		act(() => {
			result.current.handleSubmit({
				preventDefault: () => {},
			} as React.FormEvent);
		});

		expect(mockNavigate).toHaveBeenCalledWith("/s/random-slug");
	});

	it("validates and navigates when name is valid", async () => {
		const { useLandingForm } = await import(
			"@/client/components/features/landing/useLandingForm.js"
		);
		const { result } = renderHook(() => useLandingForm());

		act(() => {
			result.current.setName("valid-slug");
		});

		act(() => {
			result.current.handleSubmit({
				preventDefault: () => {},
			} as React.FormEvent);
		});

		expect(mockNavigate).toHaveBeenCalledWith("/s/valid-slug");
	});

	it("sets error when name is invalid", async () => {
		const { useLandingForm } = await import(
			"@/client/components/features/landing/useLandingForm.js"
		);
		const { result } = renderHook(() => useLandingForm());

		act(() => {
			result.current.setName("invalid slug!");
		});

		act(() => {
			result.current.handleSubmit({
				preventDefault: () => {},
			} as React.FormEvent);
		});

		expect(result.current.error).toBe("errors.slugInvalidChars");
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it("clears error when name changes", async () => {
		const { useLandingForm } = await import(
			"@/client/components/features/landing/useLandingForm.js"
		);
		const { result } = renderHook(() => useLandingForm());

		act(() => {
			result.current.setName("invalid slug!");
		});

		act(() => {
			result.current.handleSubmit({
				preventDefault: () => {},
			} as React.FormEvent);
		});

		expect(result.current.error).toBe("errors.slugInvalidChars");

		act(() => {
			result.current.setName("new-name");
		});

		expect(result.current.error).toBeNull();
	});
});
