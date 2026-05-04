import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsModal } from "@/client/components/SettingsModal";

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

	it("renders password protection controls when enabled", async () => {
		const onSetPassword = vi.fn();
		const onRemovePassword = vi.fn();
		const onLock = vi.fn();
		render(
			<SettingsModal
				open={true}
				enabled={false}
				onToggle={vi.fn()}
				onClose={vi.fn()}
				passwordProtectionEnabled={true}
				isProtected={true}
				onSetPassword={onSetPassword}
				onRemovePassword={onRemovePassword}
				onLock={onLock}
			/>,
		);

		expect(screen.getByText(/password protection/i)).toBeDefined();
		await userEvent.type(screen.getByLabelText(/new password/i), "new-pass");
		await userEvent.click(
			screen.getByRole("button", { name: /change password/i }),
		);
		expect(onSetPassword).toHaveBeenCalledWith("new-pass");

		await userEvent.click(
			screen.getByRole("button", { name: /remove protection/i }),
		);
		expect(onRemovePassword).toHaveBeenCalledTimes(1);

		await userEvent.click(screen.getByRole("button", { name: /lock now/i }));
		expect(onLock).toHaveBeenCalledTimes(1);
	});

	it("hides auto-save controls when the auto-save feature is disabled", () => {
		render(
			<SettingsModal
				open={true}
				enabled={false}
				onToggle={vi.fn()}
				onClose={vi.fn()}
				autoSaveFeatureEnabled={false}
				passwordProtectionEnabled={true}
			/>,
		);

		expect(screen.queryByRole("switch")).toBeNull();
		expect(screen.queryByText(/auto-save/i)).toBeNull();
		expect(screen.getByText(/password protection/i)).toBeDefined();
	});
});
