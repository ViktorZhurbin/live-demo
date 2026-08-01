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
// that page carries two demos sharing the same id="preview".
test("an inline demo's own external import resolves and renders real output", async ({
	page,
}) => {
	await page.goto("/guide/usage");

	const demo = page.getByTestId("import-demo");

	// This demo sits near the bottom of a long page, and its runtime doesn't
	// load until it's near the viewport (see web/lazy.tsx's gate). What's under
	// test here is the build-time import seam, not eagerness, so scroll first.
	// The wrapper is plain MDX markup and exists while the demo is still
	// gated; `preview` only appears once the demo has mounted, so scrolling to
	// *it* would wait for something the scroll is what produces.
	await demo.scrollIntoViewIfNeeded();

	const preview = demo.getByTestId("preview");

	await expect(preview.locator("svg")).toBeVisible();
	// A demo whose import failed to resolve renders the error overlay instead
	// of its output.
	await expect(page.getByText("Can't resolve import")).toBeHidden();
});
