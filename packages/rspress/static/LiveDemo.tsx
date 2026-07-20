import "@live-demo/rspress/web/index.css";
import type { LiveDemoStringifiedProps } from "@live-demo/rspress/web";
import { LiveDemoLazy } from "@live-demo/rspress/web/lazy";
import { useDark } from "@rspress/core/runtime";

/**
 * Default layout, rendered per `<LiveDemo />` that `remarkPlugin` injects.
 *
 * Everything about keeping the demo runtime off non-demo pages — the async
 * boundary, the loading skeleton, the failed-load fallback — lives in
 * `web/lazy`. A `customLayout` should render `LiveDemoLazy` the same way;
 * importing `Core` from `@live-demo/rspress/web` directly reintroduces the
 * sitewide cost documented in AUDIT.md F1.
 */
const LiveDemo = (props: LiveDemoStringifiedProps) => {
	const isDark = useDark();

	return <LiveDemoLazy pluginProps={props} isDark={isDark} />;
};

export default LiveDemo;
