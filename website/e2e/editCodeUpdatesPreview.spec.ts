import { expect, test } from "@playwright/test";

// Targets the single-demo "Basic" page so locators stay unambiguous: one
// editor panel (#editor), one preview panel (#preview). See
// docs/guide/external/basic.mdx / snippets/basic/Basic.tsx.
test.describe("editing a demo's code updates its preview", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/guide/external/basic");
	});

	test("the rendered demo is interactive before any edit", async ({ page }) => {
		const preview = page.getByTestId("preview");

		await expect(preview.getByText("Count is 0")).toBeVisible();

		await preview.getByRole("button", { name: "Increment" }).click();

		await expect(preview.getByText("Count is 1")).toBeVisible();
	});

	test("editing the source recompiles and re-renders the preview", async ({
		page,
	}) => {
		const editorContent = page.locator("#editor .cm-content");
		const preview = page.getByTestId("preview");

		await expect(preview.getByText("Count is 0")).toBeVisible();

		await editorContent.click();
		await page.keyboard.press("ControlOrMeta+A");
		// insertText (not `.type()`) bypasses CodeMirror's closeBrackets
		// extension, which would otherwise auto-insert a matching `}`/`>` for
		// every one typed here and corrupt the source.
		await page.keyboard.insertText(
			"export const Basic = () => <div>EDITED_BY_TEST</div>;",
		);

		await expect(preview.getByText("EDITED_BY_TEST")).toBeVisible();
		await expect(preview.getByText("Count is", { exact: false })).toBeHidden();
	});
});
