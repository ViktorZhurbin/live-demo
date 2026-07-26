import { expect, test } from "@playwright/test";

// Covers the build-time seam this spec exists for: an inline block's own
// source is parsed for its imports (`collectInlineImports`), so a package no
// other demo mentions still reaches the virtual module. External demos get
// that from `collectDemoFiles` instead, so no `file=` spec covers this path.
//
// `qrcode.react` is a real website dependency imported by nothing else on the
// site, so nothing could make it resolve by coincidence. It also renders
// output genuinely derived from the import having run (an actual QR code, not
// a styled div), so a build that silently dropped the import would show an
// empty preview rather than something that merely looks plausible.
//
// Scoped to the `data-testid="import-demo"` wrapper in docs/guide/usage.mdx --
// that page carries three demos sharing the same id="preview".
test("an inline demo's own external import resolves and renders real output", async ({
	page,
}) => {
	await page.goto("/guide/usage");

	const preview = page.getByTestId("import-demo").getByTestId("preview");

	await expect(preview.locator("svg")).toBeVisible();
	// A demo whose import failed to resolve renders the error overlay instead
	// of its output.
	await expect(page.getByText("Can't resolve import")).toBeHidden();
});
