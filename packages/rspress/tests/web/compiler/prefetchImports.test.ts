import { beforeEach, describe, expect, it, vi } from "vitest";
import { prefetchImports } from "~web/compiler/prefetchImports";

const { loadImportsMock } = vi.hoisted(() => ({
	loadImportsMock: vi.fn<(importNames: readonly string[]) => Promise<void>>(
		async () => {},
	),
}));

vi.mock("_live_demo_virtual_modules", () => ({
	loadImports: loadImportsMock,
	default: () => {},
}));

describe("prefetchImports", () => {
	beforeEach(() => {
		loadImportsMock.mockClear();
		loadImportsMock.mockImplementation(async () => {});
	});

	it("starts loading the demo's externals", () => {
		prefetchImports(["react", "three"]);

		expect(loadImportsMock).toHaveBeenCalledWith(["react", "three"]);
	});

	it.each([
		["undefined", undefined],
		["empty", []],
	])("does nothing when the list is %s", (_label, importNames) => {
		prefetchImports(importNames);

		expect(loadImportsMock).not.toHaveBeenCalled();
	});

	/**
	 * The prefetch is fire-and-forget, so a rejection has nobody to catch it —
	 * unhandled, it surfaces as a console error on an otherwise working page
	 * (the real load path retries and reports properly). This is the whole
	 * reason the helper exists rather than calling `loadImports` inline.
	 */
	it("swallows a failed load instead of leaving an unhandled rejection", async () => {
		loadImportsMock.mockRejectedValueOnce(new Error("chunk load failed"));

		// Asserted on the returned promise rather than a process-level
		// `unhandledRejection` listener: the listener never fires under the test
		// runner, so that version of this test passed with the `.catch` removed.
		await expect(prefetchImports(["three"])).resolves.toBeUndefined();
	});
});
