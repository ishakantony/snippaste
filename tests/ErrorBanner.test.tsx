import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBanner } from "@/client/components/features/snip/ErrorBanner.js";

describe("ErrorBanner", () => {
	it("renders when loadError is true", () => {
		render(<ErrorBanner loadError={true} />);
		expect(screen.getByText(/load error/)).toBeDefined();
	});

	it("is hidden when loadError is false", () => {
		const { container } = render(<ErrorBanner loadError={false} />);
		expect(container.firstChild).toBeNull();
	});
});
