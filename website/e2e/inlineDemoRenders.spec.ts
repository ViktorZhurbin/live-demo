import { expect, test } from "@playwright/test";

// Targets the second ` ```jsx live ` block on this page (the React-hooks
// counter), not the first (a static Badge). The page has two separate <Tabs>
// groups, each with a live demo in its active "Live" tab, so two demos share
// the id="editor"/id="preview" that Panel assigns -- .nth(1) disambiguates
// instead of the single-demo `#editor` pattern other specs use. See
// docs/guide/inline/preDefinedImports.mdx.
test.describe("an inline ```lang live``` demo renders and runs in the browser", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/guide/inline/preDefinedImports");
	});

	test("the rendered demo is interactive before any edit", async ({ page }) => {
		const preview = page.getByTestId("preview").nth(1);

		await expect(preview.getByText("Count is: 0")).toBeVisible();

		await preview.getByRole("button", { name: "Increment" }).click();

		await expect(preview.getByText("Count is: 1")).toBeVisible();
	});

	test("editing the source recompiles and re-renders the preview", async ({
		page,
	}) => {
		const editorContent = page.locator("#editor .cm-content").nth(1);
		const preview = page.getByTestId("preview").nth(1);

		await expect(preview.getByText("Count is: 0")).toBeVisible();

		await editorContent.click();
		await page.keyboard.press("ControlOrMeta+A");
		// insertText (not `.type()`) bypasses CodeMirror's closeBrackets
		// extension, which would otherwise auto-insert a matching `}`/`>` for
		// every one typed here and corrupt the source.
		await page.keyboard.insertText(
			"export const App = () => <div>EDITED_BY_TEST</div>;",
		);

		await expect(preview.getByText("EDITED_BY_TEST")).toBeVisible();
		await expect(preview.getByText("Count is", { exact: false })).toBeHidden();
	});
});
