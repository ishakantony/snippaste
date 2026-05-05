import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBar } from "@/client/components/features/snip/StatusBar";

function statusBarText(container: HTMLElement): {
	lines: string | null;
	chars: string | null;
} {
	const spans = container.querySelectorAll("[data-testid='status-bar'] span");
	return {
		lines: spans[0]?.textContent ?? null,
		chars: spans[1]?.textContent ?? null,
	};
}

describe("StatusBar", () => {
	it("shows 1 line and 0 chars for empty content", () => {
		const { container } = render(<StatusBar content="" />);
		const { lines, chars } = statusBarText(container);
		expect(lines).toBe("1 line");
		expect(chars).toBe("0 chars");
	});

	it("shows correct count for single line", () => {
		const { container } = render(<StatusBar content="Hello" />);
		const { lines, chars } = statusBarText(container);
		expect(lines).toBe("1 line");
		expect(chars).toBe("5 chars");
	});

	it("shows plural lines for multi-line content", () => {
		const { container } = render(
			<StatusBar content={"line one\nline two\nline three"} />,
		);
		const { lines, chars } = statusBarText(container);
		expect(lines).toBe("3 lines");
		expect(chars).toBe("28 chars");
	});

	it("shows 2 lines for content ending with newline", () => {
		const { container } = render(<StatusBar content={"abc\n"} />);
		const { lines, chars } = statusBarText(container);
		expect(lines).toBe("2 lines");
		expect(chars).toBe("4 chars");
	});

	it("updates counts when re-rendered with new content", () => {
		const { container, rerender } = render(<StatusBar content="Hi" />);
		expect(statusBarText(container).chars).toBe("2 chars");

		rerender(<StatusBar content="Hello world" />);
		expect(statusBarText(container).chars).toBe("11 chars");
		expect(statusBarText(container).lines).toBe("1 line");
	});
});
