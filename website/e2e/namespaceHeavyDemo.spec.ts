import { expect, test } from "@playwright/test";

// The react-three-fiber demo on docs/guide/external/goWild.mdx, which is the
// heaviest thing the site runs and the only page exercising a namespace-heavy
// external end to end: `Atom.jsx` does `import * as THREE from "three"` and
// reads `THREE.Color` off the namespace object.
//
// That's the shape most exposed to `moduleRunner.ts`'s `wrapExternal` Proxy,
// which throws UNDEFINED_NAMED_IMPORT on a property an external doesn't
// export. Unit tests cover the trap against a stand-in module; only this page
// covers it against real packages resolved through the virtual module, where
// a namespace with an unexpected shape would surface as an overlay instead of
// a rendered scene.
test.describe("a demo importing a namespace-heavy external renders", () => {
	test("the three.js scene mounts with no error overlay", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (message) => {
			if (message.type() === "error") consoleErrors.push(message.text());
		});

		await page.goto("/guide/external/goWild");

		const preview = page.getByTestId("preview");

		// r3f only creates its <canvas> once the component tree evaluates, so a
		// canvas here means every file in the demo compiled, every external
		// resolved, and no property read tripped the Proxy.
		await expect(preview.locator("canvas")).toBeVisible();

		await expect(preview.getByText("Import '")).toBeHidden();
		await expect(preview.getByText("Couldn't")).toBeHidden();

		expect(
			consoleErrors.filter((text) => text.includes("is undefined")),
		).toEqual([]);
	});
});
