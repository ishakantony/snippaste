import { expect, test } from "@playwright/test";
import {
	confirmDialog,
	createSnipViaApi,
	editor,
	enableAutoSave,
	expectAutoSaved,
	openSettings,
	setEditorText,
	typeInEditor,
	uniqueSlug,
} from "./helpers.js";

test("creates a snip, autosaves content, and reloads persisted text", async ({
	page,
}) => {
	const slug = uniqueSlug("editor-autosave");
	const content = "Management demo snip\nSaved by the Playwright robot.";

	await enableAutoSave(page);
	await page.goto("/");
	await page.getByLabel("Snip name").fill(slug);
	await page.getByRole("button", { name: "Create snip" }).click();

	await expect(page).toHaveURL(new RegExp(`/s/${slug}$`));
	await typeInEditor(page, content);
	await expectAutoSaved(page);

	await page.reload();
	await expect(editor(page)).toContainText("Management demo snip");
	await expect(editor(page)).toContainText("Saved by the Playwright robot.");
});

test("manual save persists only after autosave is disabled", async ({
	page,
}) => {
	const slug = uniqueSlug("editor-manual");

	await enableAutoSave(page);
	await page.goto(`/s/${slug}`);
	await openSettings(page);
	await page.getByRole("switch", { name: "Auto-save" }).click();
	await expect(page.getByRole("switch", { name: "Auto-save" })).toHaveAttribute(
		"aria-checked",
		"false",
	);
	await page.keyboard.press("Escape");

	await typeInEditor(page, "Manual save content");
	await expect(page.getByTestId("save-status")).toContainText("unsaved");
	await page.reload();
	await expect(editor(page)).not.toContainText("Manual save content");

	await typeInEditor(page, "Manual save content");
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByTestId("save-status")).toContainText("saved", {
		timeout: 5_000,
	});
	await page.reload();
	await expect(editor(page)).toContainText("Manual save content");
});

test("clear confirmation removes editor content", async ({ page }) => {
	const slug = uniqueSlug("editor-clear");
	await enableAutoSave(page);
	await page.goto(`/s/${slug}`);
	await typeInEditor(page, "Clear me");
	await expectAutoSaved(page);

	await page.getByRole("button", { name: "Clear" }).click();
	await confirmDialog(page, "Clear");

	await expect(editor(page)).not.toContainText("Clear me");
});

test("refresh confirmation reloads server content", async ({
	page,
	request,
}) => {
	const slug = uniqueSlug("editor-refresh");
	await createSnipViaApi(request, slug, "Initial server content");
	await page.goto(`/s/${slug}`);
	await expect(editor(page)).toContainText("Initial server content");

	await createSnipViaApi(request, slug, "Updated server content");
	await setEditorText(page, "Unsaved local draft");
	await page.getByRole("button", { name: "Refresh" }).click();
	await confirmDialog(page, "Refresh");

	await expect(editor(page)).toContainText("Updated server content");
	await expect(editor(page)).not.toContainText("Unsaved local draft");
});

test("shows too-large status when the server rejects a save", async ({
	page,
}) => {
	const slug = uniqueSlug("editor-large");
	await enableAutoSave(page);
	await page.route(`/api/snips/${slug}`, async (route, request) => {
		if (request.method() === "PUT") {
			await route.fulfill({
				status: 413,
				json: { error: "content_too_large" },
			});
			return;
		}
		await route.continue();
	});

	await page.goto(`/s/${slug}`);
	await typeInEditor(page, "Oversized paste simulation");

	await expect(page.getByTestId("save-status")).toContainText("too large", {
		timeout: 5_000,
	});
});
