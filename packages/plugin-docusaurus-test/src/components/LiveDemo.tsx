// import "@live-demo/core/web/index.css";
import type { LiveDemoStringifiedProps } from "web/types";
import { LiveDemoCore } from "web/ui";

export const LiveDemoDocusaurus = (props: LiveDemoStringifiedProps) => {
  return <LiveDemoCore pluginProps={props} isDark />;
};
