import { expect, test } from "@playwright/test";

// Targets the single-demo "Basic" page for the same reason
// editCodeUpdatesPreview.spec.ts does: one #editor, one #preview.
test.describe("ControlPanel", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/guide/external/basic");
	});

	// ButtonFullscreen.tsx keeps `title="Toggle fullscreen"` constant across
	// both states; only the visible text/icon swaps to "Exit fullscreen".
	// Asserting on `title` alone can't tell the states apart, so this checks
	// the real Fullscreen API state instead.
	test("the fullscreen toggle enters and exits the real Fullscreen API", async ({
		page,
	}) => {
		const fullscreenButton = page.getByTitle("Toggle fullscreen");

		await fullscreenButton.click();
		await expect(fullscreenButton).toContainText("Exit fullscreen");
		expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(
			true,
		);

		await fullscreenButton.click();
		await expect(fullscreenButton).toContainText("Fullscreen");
		expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(
			false,
		);
	});

	// Scoped to ControlPanel's own wrapper (identified by the `data-icon-buttons`
	// attribute ControlPanel.tsx sets, since it has no dedicated testid):
	// rspress's own theme renders a same-titled "Toggle code wrap" button on
	// every ordinary (non-live) code block, and this page has those too.
	test("the wrap-code toggle turns CodeMirror line wrapping on and off", async ({
		page,
	}) => {
		const editorContent = page.locator("#editor .cm-content");
		const wrapButton = page
			.locator("[data-icon-buttons]")
			.getByTitle("Toggle code wrap");

		await expect(editorContent).not.toHaveClass(/cm-lineWrapping/);

		await wrapButton.click();
		await expect(editorContent).toHaveClass(/cm-lineWrapping/);

		await wrapButton.click();
		await expect(editorContent).not.toHaveClass(/cm-lineWrapping/);
	});

	// ControlPanel.tsx measures its own wrapper (NARROW_THRESHOLD = 340px),
	// not the viewport -- a narrow viewport is just the easiest way to shrink
	// that wrapper below it. In icon mode the panel-view buttons keep their
	// original `title` (labels.tsx falls back to the enum value, which equals
	// the label text), so `getByTitle` locators from the other specs stay
	// valid; only the visible text/icon inside the button changes.
	test("a narrow viewport switches panel-view buttons to icon-only", async ({
		page,
	}) => {
		const splitButton = page.getByTitle("Split view", { exact: true });

		await page.setViewportSize({ width: 1200, height: 800 });
		await expect(splitButton).toContainText("Split view");
		await expect(splitButton.locator("svg")).toHaveCount(0);

		await page.setViewportSize({ width: 320, height: 800 });
		await expect(splitButton).not.toContainText("Split view");
		await expect(splitButton.locator("svg")).toHaveCount(1);
	});
});
