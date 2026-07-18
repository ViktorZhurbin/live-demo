import "@live-demo/rspress/web/index.css";
import { Core, type LiveDemoStringifiedProps } from "@live-demo/rspress/web";
import { useDark } from "@rspress/core/runtime";

const LiveDemo = (props: LiveDemoStringifiedProps) => {
	const isDark = useDark();

	return <Core pluginProps={props} isDark={isDark} />;
};

export default LiveDemo;
