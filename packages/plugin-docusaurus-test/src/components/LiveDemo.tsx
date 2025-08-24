import {
  LiveDemoCore,
  type LiveDemoStringifiedProps,
} from "@live-demo/core/web";

export const LiveDemoDocusaurus = (props: LiveDemoStringifiedProps) => {
  return <LiveDemoCore pluginProps={props} isDark />;
};
