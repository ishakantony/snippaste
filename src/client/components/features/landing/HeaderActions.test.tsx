import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToggle = vi.fn();

vi.mock("@/client/stores/themeStore.js", () => ({
	useTheme: () => ({ theme: "dark", toggle: mockToggle }),
	THEME: { DARK: "dark", LIGHT: "light" },
}));

let featureFlagValue = true;

vi.mock("@/client/stores/featureFlagsStore.js", () => ({
	useFeatureFlag: () => featureFlagValue,
}));

describe("HeaderActions", () => {
	beforeEach(() => {
		featureFlagValue = true;
	});

	it("renders theme toggle with correct icon based on theme", async () => {
		const { HeaderActions } = await import(
			"@/client/components/features/landing/HeaderActions.js"
		);
		render(<HeaderActions />);

		expect(screen.getByLabelText(/toggle theme/i)).toBeDefined();
		expect(screen.getByText(/light mode/i)).toBeDefined();
	});

	it("shows language switcher when feature flag is enabled", async () => {
		const { HeaderActions } = await import(
			"@/client/components/features/landing/HeaderActions.js"
		);
		render(<HeaderActions />);

		expect(screen.getByLabelText(/language/i)).toBeDefined();
	});

	it("hides language switcher when feature flag is disabled", async () => {
		featureFlagValue = false;
		const { HeaderActions } = await import(
			"@/client/components/features/landing/HeaderActions.js"
		);
		render(<HeaderActions />);

		expect(screen.queryByLabelText(/language/i)).toBeNull();
	});
});
