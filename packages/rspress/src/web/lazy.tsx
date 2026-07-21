import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { PreviewSkeleton } from "./PreviewSkeleton";
import type { LiveDemoStringifiedProps } from "./types";

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

const Core = lazy(() =>
	import("./ui/Core/Core").then((module) => ({ default: module.Core })),
);

// Arbitrary; just has to look like code rather than a progress bar.
const EDITOR_SKELETON_LINE_WIDTHS = ["70%", "90%", "40%", "80%", "55%"];

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
				{EDITOR_SKELETON_LINE_WIDTHS.map((width) => (
					<div
						key={width}
						className="live-demo-fallback-shape live-demo-fallback-line"
						style={{ width }}
					/>
				))}
			</div>
			{/* Same component `CodeRunner` renders into the real preview pane, so
			    this slot doesn't change appearance when `Core` mounts and the
			    wait continues through the first compile. */}
			<div className="live-demo-fallback-preview">
				<PreviewSkeleton />
			</div>
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

/**
 * `ErrorBoundary` wraps `Suspense`, not the reverse: `Suspense` only catches
 * the *pending* import promise. A *rejected* one (flaky network, or a stale
 * page referencing a chunk hash a redeploy removed) is re-thrown during
 * render — past `Core`'s own error boundary, which lives inside `Preview`
 * and never mounts when `Core` itself fails to load. `React.lazy` never
 * retries a rejected import, hence "reload the page" rather than a retry
 * affordance.
 */
export const LiveDemoLazy = (props: LiveDemoLazyProps) => (
	<ErrorBoundary fallback={<ErrorFallback />}>
		<Suspense fallback={<LoadingFallback />}>
			<Core {...props} />
		</Suspense>
	</ErrorBoundary>
);
