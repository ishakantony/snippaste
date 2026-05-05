import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseDocumentLanguage = vi.fn();

vi.mock("@/client/hooks/useDocumentLanguage.js", () => ({
	useDocumentLanguage: () => mockUseDocumentLanguage(),
}));

vi.mock("@/client/components/features/landing/useLandingForm.js", () => ({
	useLandingForm: () => ({
		name: "",
		error: null,
		setName: vi.fn(),
		handleSubmit: vi.fn(),
	}),
}));

describe("LandingPage", () => {
	beforeEach(() => {
		mockUseDocumentLanguage.mockClear();
	});

	it("renders landing page with data-testid", async () => {
		const { LandingPage } = await import("@/client/pages/LandingPage.js");
		render(<LandingPage />);
		expect(screen.getByTestId("landing-page")).toBeDefined();
	});

	it("renders HeaderActions, HeroSection, CreateSnipForm", async () => {
		const { LandingPage } = await import("@/client/pages/LandingPage.js");
		render(<LandingPage />);
		expect(screen.getByLabelText(/toggle theme/i)).toBeDefined();
		expect(screen.getByText("Snippaste")).toBeDefined();
		expect(screen.getByRole("button", { name: /create snip/i })).toBeDefined();
	});

	it("calls useDocumentLanguage on mount", async () => {
		const { LandingPage } = await import("@/client/pages/LandingPage.js");
		render(<LandingPage />);
		expect(mockUseDocumentLanguage).toHaveBeenCalledTimes(1);
	});
});
