import { expect, type Page, test } from "@playwright/test";

function uniqueSlug(prefix: string) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function editor(page: Page) {
	return page.getByTestId("snip-editor").locator(".cm-content");
}

async function typeInEditor(page: Page, text: string) {
	await editor(page).click();
	await page.keyboard.type(text);
}

async function enableAutoSave(page: Page) {
	await page.addInitScript(() => {
		window.localStorage.setItem("snip-autosave", "true");
	});
}

test.beforeEach(async ({ page }) => {
	await enableAutoSave(page);
});

test("creates a snip, autosaves content, and reloads persisted text", async ({
	page,
}) => {
	const slug = uniqueSlug("demo-core");
	const content = "Management demo snip\nSaved by the Playwright robot.";

	await page.goto("/");
	await page.getByLabel("Snip name").fill(slug);
	await page.getByRole("button", { name: "Create snip" }).click();

	await expect(page).toHaveURL(new RegExp(`/s/${slug}$`));
	await typeInEditor(page, content);
	await expect(page.getByTestId("save-status")).toContainText("auto-saved", {
		timeout: 5_000,
	});

	await page.reload();
	await expect(editor(page)).toContainText("Management demo snip");
	await expect(editor(page)).toContainText("Saved by the Playwright robot.");
});

test("syncs edits into a second browser page", async ({ browser }) => {
	const slug = uniqueSlug("demo-sync");
	const context = await browser.newContext();
	await context.addInitScript(() => {
		window.localStorage.setItem("snip-autosave", "true");
	});
	const first = await context.newPage();
	const second = await context.newPage();

	try {
		await first.goto(`/s/${slug}`);
		await second.goto(`/s/${slug}`);

		await expect(editor(first)).toBeVisible();
		await expect(editor(second)).toBeVisible();

		await typeInEditor(first, "Live sync from browser one");
		await expect(first.getByTestId("save-status")).toContainText("auto-saved", {
			timeout: 5_000,
		});

		await expect(editor(second)).toContainText("Live sync from browser one", {
			timeout: 5_000,
		});
	} finally {
		await context.close();
	}
});
