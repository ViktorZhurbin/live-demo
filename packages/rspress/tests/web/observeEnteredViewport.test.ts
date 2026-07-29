import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeEnteredViewport } from "~web/observeEnteredViewport";

type Callback = (entries: { isIntersecting: boolean }[]) => void;

/**
 * The test env (vitest, `environment: "node"`) has no `IntersectionObserver`
 * at all, so this stands in for the real thing: same constructor shape, but
 * `observe`/`disconnect` are spies and intersection is triggered manually via
 * `emit` instead of a real layout engine.
 *
 * `emit` takes a list because the real API delivers one: a single target can
 * produce several records in one callback when changes coalesce, and a fake
 * that could only ever deliver one would hide exactly that case.
 */
class FakeIntersectionObserver {
	static instances: FakeIntersectionObserver[] = [];

	callback: Callback;
	options: IntersectionObserverInit | undefined;
	disconnected = false;
	observe = vi.fn<(element: Element) => void>();
	// Mirrors the real API: once disconnected, no further callbacks fire.
	disconnect = vi.fn<() => void>(() => {
		this.disconnected = true;
	});

	constructor(callback: Callback, options?: IntersectionObserverInit) {
		this.callback = callback;
		this.options = options;
		FakeIntersectionObserver.instances.push(this);
	}

	emit(...intersections: boolean[]) {
		if (this.disconnected) return;
		this.callback(intersections.map((isIntersecting) => ({ isIntersecting })));
	}
}

const fakeElement = {} as Element;

describe("observeEnteredViewport", () => {
	beforeEach(() => {
		FakeIntersectionObserver.instances = [];
		vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("observes the element with the given options", () => {
		observeEnteredViewport(fakeElement, vi.fn<() => void>(), {
			rootMargin: "400px",
		});

		const [observer] = FakeIntersectionObserver.instances;

		expect(observer?.observe).toHaveBeenCalledWith(fakeElement);
		expect(observer?.options).toEqual({ rootMargin: "400px" });
	});

	it("does nothing while the element hasn't intersected yet", () => {
		const onEnter = vi.fn<() => void>();
		observeEnteredViewport(fakeElement, onEnter);

		FakeIntersectionObserver.instances[0]?.emit(false);

		expect(onEnter).not.toHaveBeenCalled();
	});

	// The failure this guards against is silent and permanent, not a missed
	// frame: after a coalesced batch the element is stably in view, so no
	// further change queues a record and nothing fires the observer again.
	// A gate reading only `entries[0]` would leave the demo loading forever.
	it("opens when a coalesced batch ends intersecting, not just its first entry", () => {
		const onEnter = vi.fn<() => void>();
		observeEnteredViewport(fakeElement, onEnter);

		FakeIntersectionObserver.instances[0]?.emit(false, true);

		expect(onEnter).toHaveBeenCalledTimes(1);
	});

	// Ordering is the whole of "one-shot": disconnecting *before* `onEnter`
	// runs is what stops an observer callback delivered during it (or a
	// re-entrant one) from firing the gate twice. Asserting only that both
	// happened would pass with the two lines swapped.
	it("disconnects before calling onEnter, not after", () => {
		let disconnectedFirst = false;
		const onEnter = vi.fn<() => void>(() => {
			disconnectedFirst =
				FakeIntersectionObserver.instances[0]?.disconnected ?? false;
		});

		observeEnteredViewport(fakeElement, onEnter);
		FakeIntersectionObserver.instances[0]?.emit(true);

		expect(onEnter).toHaveBeenCalledTimes(1);
		expect(disconnectedFirst).toBe(true);
	});

	it("returns a cleanup function that disconnects the observer", () => {
		const cleanup = observeEnteredViewport(fakeElement, vi.fn<() => void>());

		cleanup();

		expect(
			FakeIntersectionObserver.instances[0]?.disconnect,
		).toHaveBeenCalledTimes(1);
	});

	it("calls onEnter immediately when IntersectionObserver doesn't exist", () => {
		vi.unstubAllGlobals();
		vi.stubGlobal("IntersectionObserver", undefined);

		const onEnter = vi.fn<() => void>();
		const cleanup = observeEnteredViewport(fakeElement, onEnter);

		expect(onEnter).toHaveBeenCalledTimes(1);
		expect(() => cleanup()).not.toThrow();
	});
});
