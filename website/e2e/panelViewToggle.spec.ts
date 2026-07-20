import { expect, test } from "@playwright/test";

// Each test gets a fresh, isolated browser context (and therefore fresh
// localStorage), so the shared `resizablePanels.autoSaveId` in
// rspress.config.ts doesn't leak view state between tests here.
test.describe("the panel-view toggle changes which panels are shown", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/guide/external/basic");
	});

	test("defaults to split view: both editor and preview visible", async ({
		page,
	}) => {
		await expect(page.locator("#editor .cm-content")).toBeVisible();
		await expect(
			page.getByTestId("preview").getByText("Count is 0"),
		).toBeVisible();
	});

	test("switching to Preview view collapses the editor panel", async ({
		page,
	}) => {
		const previewToggle = page.getByTitle("Preview", { exact: true });

		await previewToggle.click();

		await expect(previewToggle).toHaveAttribute("data-active", "true");
		// Assert on the Panel's own container, not content inside it: a
		// collapsed Panel shrinks to zero along the main axis but keeps
		// `overflow: visible` (see ResizablePanels.tsx), so descendant elements
		// like `.cm-content` can still report a non-empty bounding box.
		await expect(page.getByTestId("editor")).toBeHidden();
		await expect(
			page.getByTestId("preview").getByText("Count is 0"),
		).toBeVisible();
	});

	test("switching to Editor view collapses the preview panel", async ({
		page,
	}) => {
		const editorToggle = page.getByTitle("Editor", { exact: true });

		await editorToggle.click();

		await expect(editorToggle).toHaveAttribute("data-active", "true");
		await expect(page.locator("#editor .cm-content")).toBeVisible();
		await expect(page.getByTestId("preview")).toBeHidden();
	});

	test("switching back to Split view restores both panels", async ({
		page,
	}) => {
		await page.getByTitle("Preview", { exact: true }).click();
		await expect(page.getByTestId("editor")).toBeHidden();

		await page.getByTitle("Split view", { exact: true }).click();

		await expect(page.locator("#editor .cm-content")).toBeVisible();
		await expect(
			page.getByTestId("preview").getByText("Count is 0"),
		).toBeVisible();
	});
});
