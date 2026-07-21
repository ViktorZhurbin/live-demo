import { expect, test } from "@playwright/test";

// Covers web/lazy.tsx's ErrorBoundary: a *rejected* dynamic import (flaky
// network, or a stale page referencing a chunk hash a redeploy removed),
// which Suspense alone does not catch (see that file's docblock).
//
// The chunk that lazy-loads Core (`import("./index")`) is content-hashed, so
// its filename isn't stable across builds. Instead of hardcoding a hash,
// every async chunk request is fetched and inspected for a string unique to
// that module (a LiveDemoProvider error message) and only that one request
// is aborted; everything else passes through untouched so the rest of the
// page loads normally.
test("a rejected lazy-chunk import shows the reload fallback instead of hanging", async ({
	page,
}) => {
	let blocked = false;

	await page.route("**/static/js/async/*.js", async (route) => {
		if (blocked) {
			await route.continue();
			return;
		}

		const response = await route.fetch();
		const body = await response.text();

		if (body.includes("Wrap this component tree in")) {
			blocked = true;
			await route.abort();
		} else {
			await route.fulfill({ response });
		}
	});

	await page.goto("/guide/external/basic");

	await expect(
		page.getByText("Couldn't load this demo. Try reloading the page."),
	).toBeVisible();
	expect(blocked).toBe(true);
});
