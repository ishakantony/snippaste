import { expect, test } from "@playwright/test";
import { uniqueSlug } from "./helpers";

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
	await expect(page.getByLabel("Snip name")).toBeVisible();
	await expect(page.getByRole("button", { name: "Create snip" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Language" })).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Toggle theme" }),
	).toBeVisible();
	await expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
	await page.getByLabel("Snip name").fill(slug);
	await page.getByRole("button", { name: "Create snip" }).click();

	await expect(page).toHaveURL(new RegExp(`/s/${slug}$`));
	await expect(page.getByTestId("snip-editor")).toBeVisible();
});

test("mobile landing scrolls on short screens", async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 430 });

	await page.goto("/");
	const landing = page.getByTestId("landing-page");
	await expect(landing).toBeVisible();
	await expect(
		await landing.evaluate((el) => el.scrollHeight > el.clientHeight),
	).toBe(true);

	await landing.evaluate((el) => el.scrollTo(0, el.scrollHeight));
	await expect(await landing.evaluate((el) => el.scrollTop > 0)).toBe(true);
});
