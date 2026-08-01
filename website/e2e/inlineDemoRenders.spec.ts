import { expect, test } from "@playwright/test";

// The inline (` ```lang live `) counterpart to editCodeUpdatesPreview.spec.ts,
// which makes these same two assertions against an external (`file=`) demo.
// The overlap is deliberate: inline and external demos reach the runtime by
// different build-time paths (parsed in place vs. read off disk and walked),
// so one passing says nothing about the other.
//
// Scoped to the `data-testid="inline-demo"` wrapper in docs/guide/usage.mdx --
// that page carries two demos, both sharing the id="editor"/id="preview" that
// Panel assigns, so the wrapper is what keeps these locators unambiguous.
test.describe("an inline ```lang live``` demo renders and runs in the browser", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/guide/usage");

		// This demo may sit past the gate's reach at the default viewport, in
		// which case its runtime doesn't load until scrolled to (see
		// web/lazy.tsx). These tests are about the inline build path, not about
		// when loading starts, so bring it into view first. The wrapper below is
		// plain MDX markup, present whether or not the demo has mounted.
		await page.getByTestId("inline-demo").scrollIntoViewIfNeeded();
	});

	test("the rendered demo is interactive before any edit", async ({ page }) => {
		const preview = page.getByTestId("inline-demo").getByTestId("preview");

		await expect(preview.getByText("Count is: 0")).toBeVisible();

		await preview.getByRole("button", { name: "Increment" }).click();

		await expect(preview.getByText("Count is: 1")).toBeVisible();
	});

	test("editing the source recompiles and re-renders the preview", async ({
		page,
	}) => {
		const demo = page.getByTestId("inline-demo");
		const editorContent = demo.locator("#editor .cm-content");
		const preview = demo.getByTestId("preview");

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
