import { type APIRequestContext, expect, type Page } from "@playwright/test";

export function uniqueSlug(prefix: string) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function editor(page: Page) {
	return page.getByTestId("snip-editor").locator(".cm-content");
}

export async function enableAutoSave(page: Page) {
	await page.addInitScript(() => {
		window.localStorage.setItem(
			"snip-autosave",
			JSON.stringify({ state: { enabled: true }, version: 0 }),
		);
	});
}

export async function typeInEditor(page: Page, text: string) {
	await editor(page).click();
	await page.keyboard.type(text);
}

export async function setEditorText(page: Page, text: string) {
	await editor(page).click();
	await page.keyboard.press(
		process.platform === "darwin" ? "Meta+A" : "Control+A",
	);
	await page.keyboard.type(text);
}

export async function expectAutoSaved(page: Page) {
	await expect(page.getByTestId("save-status")).toContainText("auto-saved", {
		timeout: 5_000,
	});
}

export async function createSnipViaApi(
	request: APIRequestContext,
	slug: string,
	content: string,
	password?: string,
) {
	const res = await request.put(`/api/snips/${slug}`, {
		data: password ? { content, password } : { content },
	});
	expect(res.status()).toBe(204);
}

export async function openSettings(page: Page) {
	await page.getByRole("button", { name: "Settings" }).click();
	await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}

export async function confirmDialog(page: Page, label: string) {
	const dialog = page.getByRole("dialog");
	await expect(dialog.getByText("Are you sure?")).toBeVisible();
	await dialog.getByRole("button", { name: label }).click();
}
