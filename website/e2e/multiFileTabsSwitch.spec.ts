import { expect, test } from "@playwright/test";

// See docs/guide/external/multiFile.mdx / snippets/multiFile/{MultiFile,Imported}.tsx.
// MultiFile.tsx (the entry file) renders Imported.tsx's Badge plus its own
// Increment button, so switching tabs is checked against the editor's content
// (which file is showing) while the preview (both files' combined output)
// stays on screen throughout.
test.describe("FileTabs switches which file's source the editor shows", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/guide/external/multiFile");
	});

	test("the entry file is active by default", async ({ page }) => {
		const entryTab = page.getByRole("button", { name: "MultiFile.tsx" });
		const importedTab = page.getByRole("button", { name: "Imported.tsx" });

		await expect(entryTab).toHaveAttribute("data-active", "true");
		await expect(importedTab).toHaveAttribute("data-active", "false");
		await expect(page.locator("#editor .cm-content")).toContainText(
			"Increment",
		);
	});

	test("clicking a tab makes its file's source active in the editor", async ({
		page,
	}) => {
		const importedTab = page.getByRole("button", { name: "Imported.tsx" });

		await importedTab.click();

		await expect(importedTab).toHaveAttribute("data-active", "true");
		await expect(page.locator("#editor .cm-content")).toContainText("Badge");
		await expect(page.locator("#editor .cm-content")).not.toContainText(
			"Increment",
		);
	});

	test("the preview reflects both files regardless of the active tab", async ({
		page,
	}) => {
		const preview = page.getByTestId("preview");

		await page.getByRole("button", { name: "Imported.tsx" }).click();
		await expect(preview.getByText("Count is 0")).toBeVisible();

		await preview.getByRole("button", { name: "Increment" }).click();

		await expect(preview.getByText("Count is 3")).toBeVisible();
	});
});
