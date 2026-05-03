import { expect, test } from "@playwright/test";
import { enableAutoSave, uniqueSlug } from "./helpers.js";

test.beforeEach(async ({ page }) => {
	await enableAutoSave(page);
});

test("persists theme and language preferences after reload", async ({
	page,
}) => {
	const slug = uniqueSlug("prefs");
	await page.goto(`/s/${slug}`);

	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
	await page.getByRole("button", { name: "Toggle theme" }).click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

	await page.getByRole("button", { name: "Language" }).click();
	await page.getByRole("button", { name: "Bahasa Indonesia" }).click();
	await expect(page.getByRole("button", { name: "Pengaturan" })).toBeVisible();

	await page.reload();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
	await expect(page.getByRole("button", { name: "Pengaturan" })).toBeVisible();
});

test("copies URL and opens QR modal", async ({ page, context }) => {
	const slug = uniqueSlug("sharing");
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto(`/s/${slug}`);

	await page.getByRole("button", { name: "Copy URL" }).click();
	await expect(page.getByTestId("toast")).toContainText(
		`Copied URL: /s/${slug}`,
	);
	await expect(
		await page.evaluate(() => navigator.clipboard.readText()),
	).toContain(`/s/${slug}`);

	await page.getByRole("button", { name: "QR" }).click();
	await expect(page.getByTestId("qr-modal")).toContainText(`/s/${slug}`);
});
