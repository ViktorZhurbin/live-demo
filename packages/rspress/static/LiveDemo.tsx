import "@live-demo/rspress/web/index.css";
import {
  LiveDemoCore,
  type LiveDemoStringifiedProps,
} from "@live-demo/rspress/web";
import { useDark } from "@rspress/core/runtime";

const LiveDemo = (props: LiveDemoStringifiedProps) => {
  const isDark = useDark();

  return <LiveDemoCore pluginProps={props} isDark={isDark} />;
};

export default LiveDemo;
