import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagList } from "@/client/components/features/landing/TagList.js";

describe("TagList", () => {
	it("renders all tags with translated text", () => {
		render(<TagList />);

		expect(screen.getByText("Plain text only")).toBeDefined();
		expect(screen.getByText("Instant links")).toBeDefined();
		expect(screen.getByText("No account")).toBeDefined();
		expect(screen.getByText("30-day expiry")).toBeDefined();
	});

	it("has correct responsive classes", () => {
		const { container } = render(<TagList />);
		const wrapper = container.firstChild as HTMLElement;

		expect(wrapper.classList.contains("hidden")).toBe(true);
		expect(wrapper.classList.contains("md:flex")).toBe(true);
	});
});
