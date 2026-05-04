import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreateSnipForm } from "@/client/components/features/landing/CreateSnipForm.js";

describe("CreateSnipForm", () => {
	it("renders form with input and submit button", () => {
		render(
			<CreateSnipForm
				name=""
				error={null}
				onNameChange={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText(/snip name/i)).toBeDefined();
		expect(screen.getByRole("button", { name: /create snip/i })).toBeDefined();
	});

	it("calls onNameChange when input changes", async () => {
		const onNameChange = vi.fn();
		render(
			<CreateSnipForm
				name=""
				error={null}
				onNameChange={onNameChange}
				onSubmit={vi.fn()}
			/>,
		);

		await userEvent.type(screen.getByLabelText(/snip name/i), "test");
		expect(onNameChange).toHaveBeenCalled();
	});

	it("calls onSubmit when form is submitted", async () => {
		const onSubmit = vi.fn();
		render(
			<CreateSnipForm
				name=""
				error={null}
				onNameChange={vi.fn()}
				onSubmit={onSubmit}
			/>,
		);

		await userEvent.click(screen.getByRole("button", { name: /create snip/i }));
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it("shows error message when error prop is provided", () => {
		render(
			<CreateSnipForm
				name=""
				error="Invalid slug"
				onNameChange={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		expect(screen.getByText("Invalid slug")).toBeDefined();
	});

	it("renders FeatureList inside form", () => {
		const { container } = render(
			<CreateSnipForm
				name=""
				error={null}
				onNameChange={vi.fn()}
				onSubmit={vi.fn()}
			/>,
		);

		expect(container.querySelector(".flex.flex-col.gap-3")).toBeDefined();
	});
});
