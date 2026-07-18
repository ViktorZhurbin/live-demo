import { useElementSize } from "@mantine/hooks";
import clsx from "clsx";
import {
	Group,
	Panel,
	Separator,
	useDefaultLayout,
} from "react-resizable-panels";
import { PanelsView } from "~web/constants/settings";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";
import { useLocalStorageView } from "~web/hooks/useLocalStorage";
import { LiveDemoEditor } from "~web/ui/editor/LiveDemoEditor/LiveDemoEditor";
import { LiveDemoFileTabs } from "~web/ui/editor/LiveDemoFileTabs/LiveDemoFileTabs";
import { LiveDemoPreview } from "~web/ui/preview/LiveDemoPreview/LiveDemoPreview";

import type { LiveDemoResizablePanelsProps } from "./types";

import styles from "./LiveDemoResizablePanels.module.css";

export const LiveDemoResizablePanels = (
	props: LiveDemoResizablePanelsProps,
) => {
	const { options } = useLiveDemoContext();
	const mergedOptions = Object.assign(options?.resizablePanels ?? {}, props);

	const {
		classes,
		autoSaveId,
		verticalThreshold = 550,
		defaultPanelSizes = { editor: "50%", preview: "50%" },
	} = mergedOptions;

	const [panelsView] = useLocalStorageView();

	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: autoSaveId ?? "live-demo-resizable-panels",
		storage: autoSaveId ? localStorage : undefined,
	});

	const wrapperSize = useElementSize();
	const isVertical = wrapperSize.width < verticalThreshold;

	const wrapperClass = clsx(styles.wrapper, classes?.wrapper, {
		[styles.vertical]: isVertical,
	});

	const editorClasses = clsx(styles.editorPanel, classes?.editorPanel, {
		[styles.hiddenPanel]: panelsView === PanelsView.Preview,
	});

	const previewClasses = clsx(classes?.previewPanel, {
		[styles.hiddenPanel]: panelsView === PanelsView.Editor,
	});

	const editorPanel = (
		<Panel
			key="editor"
			id="editor"
			className={editorClasses}
			defaultSize={defaultPanelSizes.editor}
			onKeyDown={(e) => {
				// to avoid interfering with global event listeners
				e.stopPropagation();
			}}
		>
			{props.editor ?? (
				<>
					<LiveDemoFileTabs />
					<LiveDemoEditor />
				</>
			)}
		</Panel>
	);

	const previewPanel = (
		<Panel
			key="preview"
			id="preview"
			className={previewClasses}
			defaultSize={defaultPanelSizes.preview}
		>
			{props.preview ?? <LiveDemoPreview />}
		</Panel>
	);

	return (
		<div className={wrapperClass} ref={wrapperSize.ref}>
			<Group
				defaultLayout={defaultLayout}
				onLayoutChanged={onLayoutChanged}
				style={{ flexDirection: isVertical ? "column" : "row" }}
				orientation={isVertical ? "vertical" : "horizontal"}
			>
				{isVertical ? previewPanel : editorPanel}
				<Separator className={styles.resizeHandle} />
				{isVertical ? editorPanel : previewPanel}
			</Group>
		</div>
	);
};
