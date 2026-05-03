import { expect, test } from "@playwright/test";
import {
	createSnipViaApi,
	editor,
	enableAutoSave,
	expectAutoSaved,
	openSettings,
	typeInEditor,
	uniqueSlug,
} from "./helpers.js";

test.beforeEach(async ({ page }) => {
	await enableAutoSave(page);
});

test("sets, locks, unlocks, persists, and removes password protection", async ({
	page,
}) => {
	const slug = uniqueSlug("password-flow");

	await page.goto(`/s/${slug}`);
	await typeInEditor(page, "Protected browser content");
	await expectAutoSaved(page);

	await openSettings(page);
	await page.getByLabel("New password").fill("open-sesame");
	await page.getByRole("button", { name: "Enable protection" }).click();
	await expect(page.getByTestId("toast")).toContainText("Protection updated");

	await page.getByRole("button", { name: "Lock now" }).click();
	await expect(
		page.getByRole("heading", { name: "Protected snip" }),
	).toBeVisible();
	await expect(page.getByTestId("save-status")).toContainText("locked");

	await page.getByLabel("Password").fill("wrong-password");
	await page.getByRole("button", { name: "Unlock" }).click();
	await expect(
		page.getByText("Incorrect password or unlock failed."),
	).toBeVisible();

	await page.getByLabel("Password").fill("open-sesame");
	await page.getByRole("button", { name: "Unlock" }).click();
	await expect(editor(page)).toContainText("Protected browser content");

	await page.reload();
	await expect(editor(page)).toContainText("Protected browser content");

	await openSettings(page);
	await page.getByRole("button", { name: "Remove protection" }).click();
	await expect(page.getByTestId("toast")).toContainText("Protection removed");
	await page.reload();
	await expect(editor(page)).toContainText("Protected browser content");
});

test("opens a protected snip as locked before unlock", async ({
	page,
	request,
}) => {
	const slug = uniqueSlug("password-locked");
	await createSnipViaApi(request, slug, "Secret content", "open-sesame");

	await page.goto(`/s/${slug}`);

	await expect(
		page.getByRole("heading", { name: "Protected snip" }),
	).toBeVisible();
	await expect(page.getByTestId("save-status")).toContainText("locked");
});
