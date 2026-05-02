import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsModal } from "@/client/components/SettingsModal.js";

describe("SettingsModal", () => {
	it("renders auto-save toggle with current state", () => {
		render(
			<SettingsModal
				open={true}
				enabled={false}
				onToggle={vi.fn()}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByText(/auto-save/i)).toBeDefined();
		expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe(
			"false",
		);
	});

	it("calls onToggle when switch is clicked", async () => {
		const onToggle = vi.fn();
		render(
			<SettingsModal
				open={true}
				enabled={false}
				onToggle={onToggle}
				onClose={vi.fn()}
			/>,
		);

		await userEvent.click(screen.getByRole("switch"));
		expect(onToggle).toHaveBeenCalledTimes(1);
	});

	it("calls onClose when clicking backdrop", async () => {
		const onClose = vi.fn();
		render(
			<SettingsModal
				open={true}
				enabled={false}
				onToggle={vi.fn()}
				onClose={onClose}
			/>,
		);

		await userEvent.click(screen.getByRole("dialog"));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("calls onClose when pressing Escape", async () => {
		const onClose = vi.fn();
		render(
			<SettingsModal
				open={true}
				enabled={false}
				onToggle={vi.fn()}
				onClose={onClose}
			/>,
		);

		await userEvent.keyboard("{Escape}");
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("renders nothing when not open", () => {
		render(
			<SettingsModal
				open={false}
				enabled={false}
				onToggle={vi.fn()}
				onClose={vi.fn()}
			/>,
		);

		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
