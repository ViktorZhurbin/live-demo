import { expect, type Page, test } from "@playwright/test";

// Targets the single-demo "Basic" page for the same reason
// editCodeUpdatesPreview.spec.ts does: one #editor, one #preview.
//
// Only covers failures surfaced by CodeRunner (bundling/evaluating the edited
// source) via Preview's error overlay -- not the errors thrown by
// remarkPlugin at build time, which never reach a browser (see
// packages/rspress/src/shared/errors/errors.test.ts for those).
test.describe("a real failure while editing surfaces in the preview's error overlay", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/guide/external/basic");
	});

	const setCode = async (page: Page, code: string) => {
		const editorContent = page.locator("#editor .cm-content");

		await editorContent.click();
		await page.keyboard.press("ControlOrMeta+A");
		await page.keyboard.insertText(code);
	};

	test("a syntax error shows the compiler's message", async ({ page }) => {
		const preview = page.getByTestId("preview");

		await setCode(page, "export const Basic = () => { return <div>oops");

		await expect(preview.getByText("Unterminated JSX contents")).toBeVisible();
	});

	test("an unresolvable local import names the missing module", async ({
		page,
	}) => {
		const preview = page.getByTestId("preview");

		await setCode(
			page,
			'import { Nope } from "./DoesNotExist";\nexport const Basic = () => <div>{Nope}</div>;',
		);

		await expect(
			preview.getByText("Couldn't resolve `./DoesNotExist`"),
		).toBeVisible();
	});

	test("an unresolvable external import names the missing package", async ({
		page,
	}) => {
		const preview = page.getByTestId("preview");

		await setCode(
			page,
			'import { Nope } from "left-pad";\nexport const Basic = () => <div>{Nope}</div>;',
		);

		await expect(preview.getByText("Can't resolve left-pad.")).toBeVisible();
	});

	test("a missing default export names the entry file", async ({ page }) => {
		const preview = page.getByTestId("preview");

		await setCode(page, "const x = 1;");

		// exact: true -- the overlay's message line ("`Basic.tsx` has no
		// default export.") also substring-matches "No default export",
		// which is otherwise ambiguous for the title-only assertion below.
		await expect(
			preview.getByText("No default export", { exact: true }),
		).toBeVisible();
		await expect(
			preview.getByText("`Basic.tsx` has no default export."),
		).toBeVisible();
	});

	test("the last successful render stays mounted under the overlay", async ({
		page,
	}) => {
		const preview = page.getByTestId("preview");

		await expect(preview.getByText("Count is 0")).toBeVisible();

		await setCode(page, "const x = 1;");

		await expect(
			preview.getByText("No default export", { exact: true }),
		).toBeVisible();
		await expect(preview.getByText("Count is 0")).toBeVisible();
	});
});
