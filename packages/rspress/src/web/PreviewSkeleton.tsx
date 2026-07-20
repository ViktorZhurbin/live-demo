/**
 * Placeholder for the preview pane's contents while a demo is on its way.
 *
 * A demo page waits twice before anything renders — once for the runtime
 * chunk, once for Babel/Rollup and the demo's externals — and the same slot on
 * screen covers both. So both render this: `web/lazy`'s `Suspense` fallback
 * drops it into its stand-in preview pane, and `CodeRunner` renders it into the
 * real one until the first compile produces a component. Two components here
 * meant one visible area with two different loading treatments.
 *
 * Plain class names rather than a CSS module, for the reason in
 * `lazyFallback.css`: `web/lazy` renders this before `Core`'s chunk exists, so
 * the styles have to come from the eagerly-loaded `dist/web/index.css`. Both
 * call sites center their child, so this only stacks its own rows.
 */

// Stands in for rendered output, so fewer and shorter than the editor
// skeleton's lines of "code".
const SKELETON_LINE_WIDTHS = ["60%", "80%", "45%"];

export const PreviewSkeleton = () => (
	<div className="live-demo-fallback-preview-body">
		<span className="live-demo-fallback-preview-label">Loading demo…</span>
		{SKELETON_LINE_WIDTHS.map((width) => (
			<div
				key={width}
				className="live-demo-fallback-shape live-demo-fallback-line"
				style={{ width }}
			/>
		))}
	</div>
);
