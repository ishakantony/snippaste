import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureItem } from "@/client/components/features/landing/FeatureItem";
import { FeatureList } from "@/client/components/features/landing/FeatureList";

describe("FeatureItem", () => {
	it("renders icon and translated text", () => {
		render(
			<FeatureItem
				icon="zap"
				labelKey="landing.featureInstantLabel"
				descKey="landing.featureInstantDesc"
			/>,
		);

		expect(screen.getByText("Instant")).toBeDefined();
		expect(screen.getByText(/Shareable URL in one click/i)).toBeDefined();
	});
});

describe("FeatureList", () => {
	it("renders all features", () => {
		render(<FeatureList />);

		expect(screen.getByText("Instant")).toBeDefined();
		expect(screen.getByText("Plain text")).toBeDefined();
		expect(screen.getByText("Ephemeral")).toBeDefined();
	});

	it("passes correct props to each FeatureItem", () => {
		const { container } = render(<FeatureList />);
		const items = container.querySelectorAll(".flex.items-center.gap-2\\.5");

		expect(items).toHaveLength(3);
	});
});
