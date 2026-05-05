import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroSection } from "@/client/components/features/landing/HeroSection";

describe("HeroSection", () => {
	it("renders brand name", () => {
		render(<HeroSection />);
		expect(screen.getByText("Snippaste")).toBeDefined();
	});

	it("renders heading with translated text", () => {
		render(<HeroSection />);
		expect(screen.getByText("Share text.")).toBeDefined();
		expect(screen.getByText("Instantly.")).toBeDefined();
	});

	it("renders description", () => {
		render(<HeroSection />);
		expect(
			screen.getByText(
				/Create a snip, get a link\. Share code snippets, notes, or anything in plain text/i,
			),
		).toBeDefined();
	});

	it("contains TagList component", () => {
		const { container } = render(<HeroSection />);
		expect(container.querySelector(".hidden.flex-wrap.gap-2")).toBeDefined();
	});
});
