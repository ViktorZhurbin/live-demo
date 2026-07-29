import { expect, test } from "@playwright/test";

// Covers the viewport gate in web/lazy.tsx: a demo out of view requests
// neither the editor chunk nor the compiler.
//
// Same "fetch and inspect, don't hardcode a content hash" technique as
// lazyChunkRejection.spec.ts: async chunks are content-hashed, so each is
// identified by a string unique to it — `jsxPragma` (a Sucrase transform
// option) for the compiler, `cm-content` (CodeMirror's own class name) for
// the editor — rather than by filename. Same way
// docs/ongoing/asset-size-comparison.md attributed chunks to packages.
//
// The demo is pushed below the fold by an injected spacer rather than by the
// page's own prose: every demo page in `website/docs` puts its demo within a
// few hundred px of the top, which is inside the gate's 400px rootMargin, and
// tying this test to prose length would make it fail whenever someone edits
// the copy above a demo. The `DOMContentLoaded` hop is required, not
// ceremony: `addInitScript` runs at `readyState: "loading"`, where
// `document.documentElement` and `document.head` are both still `null`
// (measured). Appending to either directly throws, Playwright swallows the
// error, and the spec then fails somewhere unrelated with no spacer in sight.
test("a below-the-fold demo loads neither the editor nor the compiler until scrolled to", async ({
	page,
}) => {
	const requested = { editor: false, compiler: false };

	await page.route("**/static/js/async/*.js", async (route) => {
		const response = await route.fetch();
		const body = await response.text();

		if (body.includes("cm-content")) requested.editor = true;
		if (body.includes("jsxPragma")) requested.compiler = true;

		await route.fulfill({ response });
	});

	await page.addInitScript(() => {
		const spacer = document.createElement("style");
		spacer.textContent = "body { padding-top: 3000px !important; }";
		document.addEventListener("DOMContentLoaded", () =>
			document.head.appendChild(spacer),
		);
	});

	await page.setViewportSize({ width: 1000, height: 400 });
	await page.goto("/guide/external/basic");

	// The skeleton is server-rendered and stays until the gate opens, so it —
	// not an empty box — is what a reader scrolling toward the demo reaches.
	const skeleton = page.getByText("Loading demo…");
	await expect(skeleton).toBeVisible();

	// "Nothing requested yet" only means "the gate is shut" once the page has
	// stopped fetching of its own accord — ungated, `Core`'s import fires
	// during hydration, so both chunks would be part of that traffic.
	await page.waitForLoadState("networkidle");
	expect(requested).toEqual({ editor: false, compiler: false });

	await skeleton.scrollIntoViewIfNeeded();

	await expect(
		page.getByTestId("preview").getByText("Count is 0"),
	).toBeVisible();
	expect(requested).toEqual({ editor: true, compiler: true });
});
