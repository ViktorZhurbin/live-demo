import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import type { LiveDemoStringifiedProps } from "./types";

/**
 * The demo runtime, behind an async boundary — what a layout should render.
 *
 * This is its own build entry (`@live-demo/rspress/web/lazy`) rather than an
 * export of the main barrel, and that separation is the whole point: the
 * barrel builds to a single `dist/web/index.mjs` whose top-level imports
 * include CodeMirror and the virtual-modules bundle, so a *static* import of
 * anything from it drags the entire demo runtime into whatever chunk the
 * importer lands in — sitewide, in rspress's case (see AUDIT.md F1). This
 * module imports it only through `import()`, so the consumer's bundler splits
 * it into an async chunk that loads when a demo actually mounts.
 *
 * `Suspense` and `ErrorBoundary` cover the two distinct failure modes of a
 * lazy chunk. `Suspense` handles the *pending* promise. A *rejected* one
 * (flaky network, or a stale page referencing a chunk hash a redeploy
 * removed) is re-thrown during render, past `Core`'s own error boundary —
 * that one lives inside `Preview`, a descendant that never mounts when
 * `Core` itself failed to load — so only a boundary above `Suspense` catches
 * it. `React.lazy` never retries a rejected import, hence "reload the page"
 * rather than a retry affordance.
 */

const Core = lazy(() =>
	import("./index").then((module) => ({ default: module.Core })),
);

// Arbitrary; just has to look like code rather than a progress bar.
const SKELETON_LINE_WIDTHS = ["70%", "90%", "40%", "80%", "55%"];

const LoadingFallback = () => (
	<div className="live-demo-fallback">
		<div className="live-demo-fallback-toolbar">
			{[0, 1, 2].map((key) => (
				<div
					key={key}
					className="live-demo-fallback-shape live-demo-fallback-button"
				/>
			))}
		</div>
		<div className="live-demo-fallback-panels">
			<div className="live-demo-fallback-editor">
				{SKELETON_LINE_WIDTHS.map((width) => (
					<div
						key={width}
						className="live-demo-fallback-shape live-demo-fallback-line"
						style={{ width }}
					/>
				))}
			</div>
			<div className="live-demo-fallback-preview">Loading demo…</div>
		</div>
	</div>
);

const ErrorFallback = () => (
	<div className="live-demo-fallback-error">
		Couldn't load this demo. Try reloading the page.
	</div>
);

interface LiveDemoLazyProps {
	isDark: boolean;
	pluginProps: LiveDemoStringifiedProps;
}

export const LiveDemoLazy = (props: LiveDemoLazyProps) => (
	<ErrorBoundary fallback={<ErrorFallback />}>
		<Suspense fallback={<LoadingFallback />}>
			<Core {...props} />
		</Suspense>
	</ErrorBoundary>
);
