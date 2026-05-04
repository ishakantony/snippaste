import { expect, test } from "@playwright/test";
import {
	createSnipViaApi,
	editor,
	enableAutoSave,
	expectAutoSaved,
	openSettings,
	typeInEditor,
	uniqueSlug,
} from "./helpers";

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

test("locked mobile snip hides edit actions", async ({ page, request }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const slug = uniqueSlug("password-mobile-locked");
	await createSnipViaApi(request, slug, "Secret content", "open-sesame");

	await page.goto(`/s/${slug}`);

	await expect(
		page.getByRole("heading", { name: "Protected snip" }),
	).toBeVisible();
	await expect(page.getByTestId("mobile-action-bar")).toBeHidden();
	await page.getByRole("button", { name: "More actions" }).click();

	const sheet = page.getByTestId("mobile-overflow-sheet");
	await expect(sheet).toBeVisible();
	await page.waitForTimeout(250);
	await expect(sheet).toBeVisible();
	await expect(sheet.getByRole("button", { name: "Language" })).toBeVisible();
	await expect(sheet.getByRole("button", { name: "Light mode" })).toBeVisible();
	await expect(sheet.getByRole("button", { name: "QR" })).toBeHidden();
	await expect(sheet.getByRole("button", { name: "Refresh" })).toBeHidden();
	await expect(sheet.getByRole("button", { name: "Settings" })).toBeHidden();
	await expect(sheet.getByRole("button", { name: "Clear" })).toBeHidden();
});

test("locked mobile snip allows language and theme changes", async ({
	page,
	request,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const slug = uniqueSlug("password-mobile-preferences");
	await createSnipViaApi(request, slug, "Secret content", "open-sesame");

	await page.goto(`/s/${slug}`);

	await expect(
		page.getByRole("heading", { name: "Protected snip" }),
	).toBeVisible();
	await page.getByRole("button", { name: "More actions" }).click();
	const sheet = page.getByTestId("mobile-overflow-sheet");
	await expect(sheet).toBeVisible();

	await sheet.getByRole("button", { name: /light mode/i }).click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
	await expect(sheet).toBeVisible();
	await expect(sheet.getByRole("button", { name: /dark mode/i })).toBeVisible();

	await sheet.getByRole("button", { name: "Language" }).click();
	await sheet.getByRole("button", { name: "Bahasa Indonesia" }).click();

	await expect(
		page.getByRole("heading", { name: "Snip terlindungi" }),
	).toBeVisible();
	await expect(sheet.getByRole("button", { name: "Bahasa" })).toBeVisible();
	await expect(sheet.getByRole("button", { name: "mode gelap" })).toBeVisible();
	await expect(page.getByTestId("mobile-action-bar")).toBeHidden();
});

test("locking from mobile settings closes the overflow sheet", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const slug = uniqueSlug("password-mobile-lock-now");

	await page.goto(`/s/${slug}`);
	await typeInEditor(page, "Protected mobile content");
	await expectAutoSaved(page);
	await page.getByRole("button", { name: "More actions" }).click();
	const sheet = page.getByTestId("mobile-overflow-sheet");
	await expect(sheet).toBeVisible();
	await sheet.getByRole("button", { name: "Settings" }).click();
	await page.getByLabel("New password").fill("open-sesame");
	await page.getByRole("button", { name: "Enable protection" }).click();
	await page.getByRole("button", { name: "Lock now" }).click();

	await expect(
		page.getByRole("heading", { name: "Protected snip" }),
	).toBeVisible();
	await expect(sheet).toBeHidden();
});

test("locked desktop snip hides edit actions but keeps header and preferences", async ({
	page,
	request,
}) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	const slug = uniqueSlug("password-desktop-locked");
	await createSnipViaApi(request, slug, "Secret content", "open-sesame");

	await page.goto(`/s/${slug}`);

	await expect(
		page.getByRole("heading", { name: "Protected snip" }),
	).toBeVisible();
	await expect(page.getByTestId("save-status")).toContainText("locked");

	await expect(page.getByRole("button", { name: "Copy URL" })).toBeHidden();
	await expect(page.getByRole("button", { name: "QR" })).toBeHidden();
	await expect(page.getByRole("button", { name: "Copy" })).toBeHidden();
	await expect(page.getByRole("button", { name: "Save" })).toBeHidden();
	await expect(page.getByRole("button", { name: "Clear" })).toBeHidden();
	await expect(page.getByRole("button", { name: "Refresh" })).toBeHidden();
	await expect(page.getByRole("button", { name: "Settings" })).toBeHidden();

	await expect(page.getByRole("button", { name: "Language" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Toggle theme" }),
	).toBeVisible();

	await expect(page.getByTitle(slug)).toBeVisible();
	await expect(page.getByTestId("save-status")).toBeVisible();
});

test("desktop status pill changes from locked to ready after unlock", async ({
	page,
	request,
}) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	const slug = uniqueSlug("password-desktop-unlock-status");
	await createSnipViaApi(request, slug, "Secret content", "open-sesame");

	await page.goto(`/s/${slug}`);

	await expect(
		page.getByRole("heading", { name: "Protected snip" }),
	).toBeVisible();
	await expect(page.getByTestId("save-status")).toContainText("locked");

	await page.getByLabel("Password").fill("open-sesame");
	await page.getByRole("button", { name: "Unlock" }).click();

	await expect(editor(page)).toContainText("Secret content");
	await expect(page.getByTestId("save-status")).toContainText("ready");
});
