import "@live-demo/rspress/web/index.css";
import type { LiveDemoStringifiedProps } from "@live-demo/rspress/web";
import { LiveDemoLazy } from "@live-demo/rspress/web/lazy";
import { useDark } from "@rspress/core/runtime";

/**
 * The actual `<LiveDemo />` injected by `remarkPlugin`.
 */
const LiveDemo = (props: LiveDemoStringifiedProps) => {
	const isDark = useDark();

	return <LiveDemoLazy pluginProps={props} isDark={isDark} />;
};

export default LiveDemo;
