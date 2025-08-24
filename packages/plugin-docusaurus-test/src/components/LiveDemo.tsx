import { LiveDemoCore, type LiveDemoStringifiedProps } from "web/index";

export const LiveDemoDocusaurus = (props: LiveDemoStringifiedProps) => {
  return <LiveDemoCore pluginProps={props} isDark />;
};
