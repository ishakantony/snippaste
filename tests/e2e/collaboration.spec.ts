import { expect, test } from "@playwright/test";
import {
	confirmDialog,
	editor,
	expectAutoSaved,
	setEditorText,
	typeInEditor,
	uniqueSlug,
} from "./helpers.js";

test("syncs edits into a second browser page", async ({ browser }) => {
	const slug = uniqueSlug("sync-clean");
	const context = await browser.newContext();
	await context.addInitScript(() => {
		window.localStorage.setItem(
			"snip-autosave",
			JSON.stringify({ state: { enabled: true }, version: 0 }),
		);
	});
	const first = await context.newPage();
	const second = await context.newPage();

	try {
		await first.goto(`/s/${slug}`);
		await second.goto(`/s/${slug}`);

		await expect(editor(first)).toBeVisible();
		await expect(editor(second)).toBeVisible();

		await typeInEditor(first, "Live sync from browser one");
		await expectAutoSaved(first);

		await expect(editor(second)).toContainText("Live sync from browser one", {
			timeout: 5_000,
		});
	} finally {
		await context.close();
	}
});

test("shows remote-change conflict and refreshes remote content", async ({
	browser,
}) => {
	const slug = uniqueSlug("sync-conflict");
	const context = await browser.newContext();
	await context.addInitScript(() => {
		window.localStorage.setItem(
			"snip-autosave",
			JSON.stringify({ state: { enabled: true }, version: 0 }),
		);
	});
	const first = await context.newPage();
	const second = await context.newPage();

	try {
		await first.goto(`/s/${slug}`);
		await second.goto(`/s/${slug}`);
		await typeInEditor(first, "Base content");
		await expectAutoSaved(first);
		await expect(editor(second)).toContainText("Base content");

		await second.route(`/api/snips/${slug}`, async (route, request) => {
			if (request.method() === "PUT") return;
			await route.continue();
		});
		await setEditorText(second, "Unsaved local conflict");
		await expect(second.getByTestId("save-status")).toContainText("saving", {
			timeout: 5_000,
		});

		await setEditorText(first, "Remote winning content");
		await expectAutoSaved(first);

		await expect(second.getByText("Remote changes available.")).toBeVisible({
			timeout: 5_000,
		});
		await second
			.getByText("Remote changes available.")
			.locator("..")
			.getByRole("button", { name: "Refresh" })
			.click();
		await confirmDialog(second, "Refresh");

		await expect(editor(second)).toContainText("Remote winning content");
	} finally {
		await context.close();
	}
});
