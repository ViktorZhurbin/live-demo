import type { ReactElement } from "react";

export type LiveDemoResizablePanelsProps = {
  editor?: ReactElement;
  preview?: ReactElement;
  /**
   * Used for auto saving the panel sizes in local storage
   */
  autoSaveId?: string;
  /**
   * Layout width threshold in px.
   * When width of the ResizablePanels' wrapper div is smaller,
   * the panels are arranged vertically.
   * Otherwise, the panels are arranged horizontally.
   * @defaultValue 550
   */
  verticalThreshold?: number;
  /**
   * Default panel sizes in %.
   */
  defaultPanelSizes?: {
    /**
     * Default panel size in %.
     * @defaultValue `50`
     */
    editor?: number;
    /**
     * Default panel size in %.
     * @defaultValue `50`
     */
    preview?: number;
  };
  classes?: {
    wrapper?: string;
    editorPanel?: string;
    previewPanel?: string;
  };
};
