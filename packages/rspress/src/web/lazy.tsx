import { lazy, type Ref, Suspense, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { observeEnteredViewport } from "./observeEnteredViewport";
import { PreviewSkeleton } from "./PreviewSkeleton";
import type { LiveDemoWidgetProps } from "./types";

/**
 * What a layout should render: the demo runtime behind an async boundary.
 *
 * Published as its own build entry (`@live-demo/rspress/web/lazy`), separate
 * from the main barrel. A *static* import of the barrel would get
 * scope-hoisted into a chunk shared by every page, dragging in CodeMirror
 * and the virtual-modules bundle even on pages with no demo. Consumers must
 * reach this module only via dynamic import, so the bundler code-splits it into
 * an async chunk that loads once a demo actually mounts.
 */

const LiveDemoRoot = lazy(() =>
	import("./ui/LiveDemoRoot/LiveDemoRoot").then((module) => ({
		default: module.LiveDemoRoot,
	})),
);

// How far ahead of the viewport edge the demo starts loading. Enough lead
// that a reader scrolling at a normal pace arrives after the download has
// started, without pulling in demos they'll never see. Applies to all four
// sides, which costs nothing for a one-shot gate.
const VIEWPORT_ROOT_MARGIN = "400px";

// Arbitrary; just has to look like code rather than a progress bar.
const EDITOR_SKELETON_LINE_WIDTHS = ["70%", "90%", "40%", "80%", "55%"];

const LoadingFallback = ({
	ref,
	hasToolbar,
}: {
	ref?: Ref<HTMLDivElement>;
	hasToolbar: boolean;
}) => (
	<div ref={ref} className="live-demo-fallback">
		{hasToolbar && (
			<div className="live-demo-fallback-toolbar">
				{[0, 1, 2].map((key) => (
					<div
						key={key}
						className="live-demo-fallback-shape live-demo-fallback-button"
					/>
				))}
			</div>
		)}
		<div className="live-demo-fallback-panels">
			<div className="live-demo-fallback-editor">
				{EDITOR_SKELETON_LINE_WIDTHS.map((width) => (
					<div
						key={width}
						className="live-demo-fallback-shape live-demo-fallback-line"
						style={{ width }}
					/>
				))}
			</div>
			{/* Same component `CodeRunner` renders into the real preview pane, so
			    this slot doesn't change appearance when `LiveDemoRoot` mounts and the
			    wait continues through the first compile. */}
			<div className="live-demo-fallback-preview">
				<PreviewSkeleton />
			</div>
		</div>
	</div>
);

/**
 * Whether the mounted widget will render a toolbar, read straight off the
 * still-stringified props. `ControlPanel` returns null under
 * `ui.controlPanel.hide`, so a skeleton that always drew one would collapse by
 * its height the moment `LiveDemoRoot` mounts — the jump this fallback exists to avoid.
 *
 * Parses `options` alone rather than going through `parseProps`, which would
 * also parse every file's full source here, on the path that has to paint
 * first. A malformed value resolves to "toolbar shown" instead of throwing:
 * `parseProps` raises `PROP_PARSE_FAILED` for it once `LiveDemoRoot` mounts, and the
 * loading skeleton is the wrong place to surface that.
 */
const hasToolbar = (options: string | undefined): boolean => {
	if (!options) return true;

	try {
		return JSON.parse(options)?.controlPanel?.hide !== true;
	} catch {
		return true;
	}
};

const ErrorFallback = () => (
	<div className="live-demo-fallback-error">
		Couldn't load this demo. Try reloading the page.
	</div>
);

/**
 * Rendering `<LiveDemoRoot>` is what triggers its `import()`, so withholding it until
 * the demo nears the viewport is what keeps a page's demos off the critical
 * path: a reader who never scrolls to one downloads neither the editor nor
 * the compiler (ADR 0004's payload axis). This boundary is the only place
 * that works — the editor rides in `LiveDemoRoot`'s own chunk group, so a gate
 * *inside* `LiveDemoRoot` can only defer what `LiveDemoRoot` itself loads lazily (Sucrase,
 * the externals), with CodeMirror already downloaded by then.
 *
 * The skeleton is what's observed. It occupies the same box the real widget
 * will (`lazyFallback.css` mirrors `ResizablePanels`' height and breakpoint),
 * so its position is settled from first paint and nothing shifts when `LiveDemoRoot`
 * swaps in. It also renders on the server, unchanged from before: the gate
 * starts shut on both sides, so hydration still matches.
 *
 * `ErrorBoundary` wraps `Suspense`, not the reverse: `Suspense` only catches
 * the *pending* import promise. A *rejected* one (flaky network, or a stale
 * page referencing a chunk hash a redeploy removed) is re-thrown during
 * render — past `LiveDemoRoot`'s own error boundary, which lives inside `Preview`
 * and never mounts when `LiveDemoRoot` itself fails to load. `React.lazy` never
 * retries a rejected import, hence "reload the page" rather than a retry
 * affordance.
 */
export const LiveDemoLazy = (props: LiveDemoWidgetProps) => {
	const [isNearViewport, setIsNearViewport] = useState(false);
	const skeletonRef = useRef<HTMLDivElement>(null);
	const toolbar = hasToolbar(props.pluginProps.options);

	useEffect(() => {
		const skeleton = skeletonRef.current;

		if (!skeleton) return;

		return observeEnteredViewport(
			skeleton,
			() => {
				setIsNearViewport(true);
			},
			{
				rootMargin: VIEWPORT_ROOT_MARGIN,
			},
		);
	}, []);

	if (!isNearViewport) {
		return <LoadingFallback ref={skeletonRef} hasToolbar={toolbar} />;
	}

	return (
		<ErrorBoundary fallback={<ErrorFallback />}>
			<Suspense fallback={<LoadingFallback hasToolbar={toolbar} />}>
				<LiveDemoRoot {...props} />
			</Suspense>
		</ErrorBoundary>
	);
};
