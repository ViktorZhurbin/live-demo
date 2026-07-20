import { expect, test } from "@playwright/test";

// rspress.config.ts sets `resizablePanels.autoSaveId: "live-demo-docs"`
// site-wide, so this is real, already-configured persistence -- not
// something added for the test.
test("panel view choice survives a page reload", async ({ page }) => {
	await page.goto("/guide/external/basic");

	const editorToggle = page.getByTitle("Editor", { exact: true });
	await editorToggle.click();
	await expect(editorToggle).toHaveAttribute("data-active", "true");
	await expect(page.getByTestId("preview")).toBeHidden();

	await page.reload();

	await expect(page.getByTitle("Editor", { exact: true })).toHaveAttribute(
		"data-active",
		"true",
	);
	await expect(page.locator("#editor .cm-content")).toBeVisible();
	await expect(page.getByTestId("preview")).toBeHidden();
});
