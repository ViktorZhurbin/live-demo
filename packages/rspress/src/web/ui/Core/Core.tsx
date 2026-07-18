import "./colors.css";
import { LiveDemoProvider } from "~web/context/LiveDemoProvider";
import type { LiveDemoStringifiedProps } from "~web/types";
import { ControlPanel } from "~web/ui/ControlPanel/ControlPanel";
import { ResizablePanels } from "~web/ui/ResizablePanels/ResizablePanels";
import { Wrapper } from "~web/ui/Wrapper/Wrapper";

interface CoreProps {
	isDark: boolean;
	pluginProps: LiveDemoStringifiedProps;
}

export const Core = (props: CoreProps) => {
	return (
		<LiveDemoProvider {...props}>
			<Wrapper>
				<ControlPanel />
				<ResizablePanels />
			</Wrapper>
		</LiveDemoProvider>
	);
};
