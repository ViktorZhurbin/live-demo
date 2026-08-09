import "./colors.css";
import { LiveDemoProvider } from "~web/context/LiveDemoProvider";
import type { LiveDemoRootProps } from "~web/types";
import { ControlPanel } from "~web/ui/ControlPanel/ControlPanel";
import { ResizablePanels } from "~web/ui/ResizablePanels/ResizablePanels";
import { Wrapper } from "~web/ui/Wrapper/Wrapper";

/**
 * Root of the tree rendered for one demo instance: sets up `LiveDemoProvider`
 * (the shared files/activeFile state) and renders the control panel above the
 * resizable editor/preview split beneath it. This is what `static/LiveDemo.tsx`
 * renders per `<LiveDemo />` in an MDX file.
 */
export const LiveDemoRoot = (props: LiveDemoRootProps) => {
	return (
		<LiveDemoProvider {...props}>
			<Wrapper>
				<ControlPanel />
				<ResizablePanels />
			</Wrapper>
		</LiveDemoProvider>
	);
};
