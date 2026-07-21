import "./colors.css";
import { LiveDemoProvider } from "~web/context/LiveDemoProvider";
import type { LiveDemoWidgetProps } from "~web/types";
import { ControlPanel } from "~web/ui/ControlPanel/ControlPanel";
import { ResizablePanels } from "~web/ui/ResizablePanels/ResizablePanels";
import { Wrapper } from "~web/ui/Wrapper/Wrapper";

/**
 * Top-level layout for one demo instance: wraps the widget tree in
 * `LiveDemoProvider` (the shared files/activeFile state) and renders the
 * control panel above the resizable editor/preview split. This is what
 * `static/LiveDemo.tsx` renders per `<LiveDemo />` in an MDX file.
 */
export const Core = (props: LiveDemoWidgetProps) => {
	return (
		<LiveDemoProvider {...props}>
			<Wrapper>
				<ControlPanel />
				<ResizablePanels />
			</Wrapper>
		</LiveDemoProvider>
	);
};
