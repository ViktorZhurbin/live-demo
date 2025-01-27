import { useFullscreen } from "@mantine/hooks";
import type { LiveDemoStringifiedProps } from "shared/types";
import { LiveDemoProvider } from "web/context";
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
  const fullscreen = useFullscreen();

  return (
    <LiveDemoProvider {...props}>
      <LiveDemoWrapper ref={fullscreen.ref}>
        <LiveDemoControlPanel fullscreen={fullscreen} />
        <LiveDemoResizablePanels />
      </LiveDemoWrapper>
    </LiveDemoProvider>
  );
};
