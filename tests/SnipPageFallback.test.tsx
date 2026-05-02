import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SnipPageErrorFallback } from "@/client/components/SnipPageErrorFallback.js";
import { SnipPageLoadingFallback } from "@/client/components/SnipPageLoadingFallback.js";

describe("snip page fallbacks", () => {
	afterEach(() => {
		cleanup();
	});

	it("uses neutral copy while the editor chunk is loading", () => {
		render(<SnipPageLoadingFallback />);

		expect(screen.getByText("Loading editor...")).toBeTruthy();
		expect(screen.queryByText("Editor error")).toBeNull();
	});

	it("uses error copy for editor failures", () => {
		render(<SnipPageErrorFallback />);

		expect(screen.getByText("Editor error")).toBeTruthy();
		expect(screen.getByText("Reload page")).toBeTruthy();
	});
});
