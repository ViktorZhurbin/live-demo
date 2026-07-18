import "./colors.css";
import { LiveDemoProvider } from "~web/context/LiveDemoProvider";
import type { LiveDemoStringifiedProps } from "~web/types";
import { LiveDemoControlPanel } from "~web/ui/controlPanel/LiveDemoControlPanel/LiveDemoControlPanel";
import { LiveDemoResizablePanels } from "~web/ui/liveDemo/LiveDemoResizablePanels/LiveDemoResizablePanels";
import { LiveDemoWrapper } from "~web/ui/liveDemo/LiveDemoWrapper/LiveDemoWrapper";

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
