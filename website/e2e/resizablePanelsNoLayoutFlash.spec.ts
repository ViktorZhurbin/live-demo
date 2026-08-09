import { expect, test } from "@playwright/test";

// Regression test for the bug documented in packages/rspress/AUDIT.md:
// `ResizablePanels`' `Group` and `ControlPanel`'s toggle group both used to
// always mount narrow (`useElementSize` starts every ref at `width: 0`), so
// at a wide viewport they rendered stacked/icon-only for one frame before
// `ResizeObserver` corrected them.
//
// Three traps from the audit's recipe, still true here:
// - `MutationObserver` must watch `childList`, not `attributes`: the wrong
//   `flex-direction`/`data-icon-buttons` is present the instant its element
//   is inserted, so an `attributes` observer sees no record for it.
// - The signature to assert on for `ResizablePanels` is `Group`'s own
//   `flex-direction` (the library sets it as an inline style keyed off its
//   `orientation` prop, and that style can't be overridden), not a wrapper
//   class name -- a class name is one JS-owned proxy for the bug, not the
//   bug itself.
// - `document`, not `document.documentElement`, as the observer target:
//   `addInitScript` runs before the parser has created `<html>`, so
//   `documentElement` is still `null` there and `.observe(null, ...)` throws
//   silently -- the observer never starts, and the run reports zero
//   mutations with no visible error.
test.describe("layout stability at a wide viewport", () => {
	test("neither ResizablePanels' Group nor ControlPanel's toggle group ever render narrow, not even transiently", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			const flexDirections: string[] = [];
			const iconButtonsFlags: string[] = [];
			Object.assign(window as unknown as Record<string, unknown>, {
				__flexDirections: flexDirections,
				__iconButtonsFlags: iconButtonsFlags,
			});

			new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					for (const node of mutation.addedNodes) {
						if (!(node instanceof HTMLElement)) continue;

						// React can insert a whole prebuilt subtree as a single
						// `addedNodes` entry, so the element we care about --
						// nested inside `Wrapper`'s own children -- isn't
						// necessarily the node reported here directly.
						const inSubtree = (selector: string) =>
							node.matches(selector)
								? [node]
								: [...node.querySelectorAll(selector)];

						for (const group of inSubtree("[data-group]")) {
							flexDirections.push(getComputedStyle(group).flexDirection);
						}
						for (const panel of inSubtree("[data-icon-buttons]")) {
							iconButtonsFlags.push(
								panel.getAttribute("data-icon-buttons") ?? "",
							);
						}
					}
				}
			}).observe(document, { childList: true, subtree: true });
		});

		await page.setViewportSize({ width: 1200, height: 800 });
		await page.goto("/guide/external/basic");
		await expect(page.locator("#editor")).toBeVisible();

		const [flexDirections, iconButtonsFlags] = await page.evaluate(() => {
			const w = window as unknown as {
				__flexDirections: string[];
				__iconButtonsFlags: string[];
			};
			return [w.__flexDirections, w.__iconButtonsFlags] as const;
		});

		expect(flexDirections.length).toBeGreaterThan(0);
		expect(flexDirections.every((direction) => direction !== "column")).toBe(
			true,
		);

		expect(iconButtonsFlags.length).toBeGreaterThan(0);
		expect(iconButtonsFlags.every((flag) => flag !== "true")).toBe(true);
	});
});
