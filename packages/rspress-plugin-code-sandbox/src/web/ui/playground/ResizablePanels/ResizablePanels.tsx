import { useElementSize } from "@mantine/hooks";
import clsx from "clsx";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { EditorCodeMirror } from "../../editor/EditorCodeMirror/EditorCodeMirror";
import { FileTabs } from "../../editor/FileTabs/FileTabs";
import { Preview } from "../../preview/Preview/Preview";
import styles from "./ResizablePanels.module.css";

const SMALL_THRESHOLD = 580;

export const ResizablePanels = () => {
	const wrapperSize = useElementSize();
	const isVertical = wrapperSize.width < SMALL_THRESHOLD;

	const wrapperClass = clsx(styles.wrapper, {
		[styles.vertical]: isVertical,
	});

	return (
		<div className={wrapperClass} ref={wrapperSize.ref}>
			<PanelGroup
				style={{ flexDirection: isVertical ? "column-reverse" : "row" }}
				direction={isVertical ? "vertical" : "horizontal"}
				autoSaveId="rspress-plugin-code-playground"
			>
				<Panel id="editor" defaultSize={50} order={isVertical ? 1 : 0}>
					<FileTabs />
					<EditorCodeMirror />
				</Panel>

				<PanelResizeHandle className={styles.resizeHandle} />

				<Panel id="preview" defaultSize={50} order={isVertical ? 0 : 1}>
					<Preview />
				</Panel>
			</PanelGroup>
		</div>
	);
};
