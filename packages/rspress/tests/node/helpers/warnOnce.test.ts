import { afterEach, describe, expect, it, vi } from "vitest";
import { resetWarnOnce, warnOnce } from "~node/helpers/warnOnce";

describe("warnOnce", () => {
	afterEach(() => {
		resetWarnOnce();
		vi.restoreAllMocks();
	});

	it("warns the first time a key is seen", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		warnOnce("a", "first message");

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith("first message");
	});

	it("doesn't warn again for the same key", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		warnOnce("a", "first message");
		warnOnce("a", "second call, same key");

		expect(warn).toHaveBeenCalledOnce();
	});

	it("warns independently for different keys", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		warnOnce("a", "message a");
		warnOnce("b", "message b");

		expect(warn).toHaveBeenCalledTimes(2);
	});
});
