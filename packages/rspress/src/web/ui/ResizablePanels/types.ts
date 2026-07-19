import type { ReactElement } from "react";
import type { ResizablePanelsOptions } from "~shared/types";

export type ResizablePanelsProps = ResizablePanelsOptions & {
	editor?: ReactElement;
	preview?: ReactElement;
	/**
	 * Layout width threshold in px.
	 * When width of the ResizablePanels' wrapper div is smaller,
	 * the panels are arranged vertically.
	 * Otherwise, the panels are arranged horizontally.
	 * @defaultValue 550
	 */
	verticalThreshold?: number;
	classes?: {
		wrapper?: string;
		editorPanel?: string;
		previewPanel?: string;
	};
};
