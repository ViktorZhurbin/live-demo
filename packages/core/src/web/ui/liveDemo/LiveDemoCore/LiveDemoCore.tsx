import { LiveDemoProvider } from "web/context";
import type { LiveDemoStringifiedProps } from "web/types";
import {
  LiveDemoControlPanel,
  LiveDemoResizablePanels,
  LiveDemoWrapper,
} from "web/ui";

interface LiveDemoCoreProps {
  isDark: boolean;
  pluginProps: LiveDemoStringifiedProps;
}

export const LiveDemoCore = (props: LiveDemoCoreProps) => {
  return (
    <LiveDemoProvider {...props}>
      <LiveDemoWrapper>
        <LiveDemoControlPanel />
        <LiveDemoResizablePanels />
      </LiveDemoWrapper>
    </LiveDemoProvider>
  );
};
