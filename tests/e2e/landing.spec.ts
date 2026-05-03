import { expect, test } from "@playwright/test";
import { uniqueSlug } from "./helpers.js";

test("creates a snip from an explicit valid slug", async ({ page }) => {
	const slug = uniqueSlug("landing-valid");

	await page.goto("/");
	await page.getByLabel("Snip name").fill(slug);
	await page.getByRole("button", { name: "Create snip" }).click();

	await expect(page).toHaveURL(new RegExp(`/s/${slug}$`));
	await expect(page.getByTestId("snip-editor")).toBeVisible();
});

test("shows validation for an invalid slug", async ({ page }) => {
	await page.goto("/");
	await page.getByLabel("Snip name").fill("bad slug!");
	await page.getByRole("button", { name: "Create snip" }).click();

	await expect(page.getByText("slug may only contain")).toBeVisible();
	await expect(page).toHaveURL(/\/$/);
});

test("generates a slug when the name is blank", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("button", { name: "Create snip" }).click();

	await expect(page).toHaveURL(/\/s\/[a-z0-9-]+$/);
	await expect(page.getByTestId("snip-editor")).toBeVisible();
});

test("mobile smoke: creates and opens an editor", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const slug = uniqueSlug("mobile");

	await page.goto("/");
	await page.getByLabel("Snip name").fill(slug);
	await page.getByRole("button", { name: "Create snip" }).click();

	await expect(page).toHaveURL(new RegExp(`/s/${slug}$`));
	await expect(page.getByTestId("snip-editor")).toBeVisible();
});
