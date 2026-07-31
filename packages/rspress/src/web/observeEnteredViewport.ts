/**
 * One-shot "has this element entered the viewport (or its rootMargin-expanded
 * box) yet" gate for `lazy.tsx`, hand-rolled even though `@mantine/hooks` is
 * already a dependency: `useInViewport` passes no options to the observer, so
 * it can't express the 400px lead the gate exists for, and `useIntersection`
 * hands back the live entry and resets it when its ref detaches — here, the
 * instant the gate opens — so a caller needs its own latch either way.
 * Neither degrades when `IntersectionObserver` is missing (one throws, the
 * other silently never opens); the fallback below is the difference between
 * "no gate" and "no demo".
 */
export const observeEnteredViewport = (
	element: Element,
	onEnter: () => void,
	options?: IntersectionObserverInit,
): (() => void) => {
	if (typeof IntersectionObserver === "undefined") {
		onEnter();
		return () => {};
	}

	// Every entry, not just the first: one delivery can carry several records
	// for a single target when changes coalesce (a fast scroll past and back
	// queues `[not-intersecting, intersecting]`). Reading only `entries[0]`
	// would leave the gate shut with the element already stably in view, so
	// nothing would ever fire the observer again — a demo that never loads.
	const observer = new IntersectionObserver((entries) => {
		if (!entries.some((entry) => entry.isIntersecting)) return;

		observer.disconnect();
		onEnter();
	}, options);

	observer.observe(element);

	return () => observer.disconnect();
};
