import "@live-demo/core/web/index.css";
import { useColorMode } from "@docusaurus/theme-common";
import {
  LiveDemoCore,
  type LiveDemoStringifiedProps,
} from "@live-demo/core/web";

const LiveDemo = (props: LiveDemoStringifiedProps) => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  return <LiveDemoCore pluginProps={props} isDark={isDark} />;
};

export default LiveDemo;
