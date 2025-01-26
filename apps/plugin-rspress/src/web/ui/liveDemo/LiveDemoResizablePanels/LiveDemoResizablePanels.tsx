import { useElementSize } from "@mantine/hooks";
import clsx from "clsx";
import { toMerged } from "es-toolkit";
import type { ReactElement } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useLiveDemoContext } from "web/context";
import { LiveDemoEditor, LiveDemoPreview } from "web/ui";
import styles from "./LiveDemoResizablePanels.module.css";

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
   * @defaultValue `580`
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

export const LiveDemoResizablePanels = (
  props: LiveDemoResizablePanelsProps,
) => {
  const { options } = useLiveDemoContext();
  const pluginOptions = options?.resizablePanels ?? {};
  const mergedOptions = toMerged(pluginOptions, props);

  const {
    classes,
    autoSaveId,
    verticalThreshold = 580,
    defaultPanelSizes = { editor: 50, preview: 50 },
  } = mergedOptions;

  const wrapperSize = useElementSize();
  const isVertical = wrapperSize.width < verticalThreshold;

  const wrapperClass = clsx(styles.wrapper, classes?.wrapper, {
    [styles.vertical]: isVertical,
  });

  return (
    <div className={wrapperClass} ref={wrapperSize.ref}>
      <PanelGroup
        autoSaveId={autoSaveId}
        style={{ flexDirection: isVertical ? "column-reverse" : "row" }}
        direction={isVertical ? "vertical" : "horizontal"}
      >
        <Panel
          id="editor"
          className={clsx(styles.editorPanel, classes?.editorPanel)}
          defaultSize={defaultPanelSizes.editor}
          order={isVertical ? 1 : 0}
          onKeyDown={(e) => {
            // to avoid interfering with the Rspress global event listeners
            e.stopPropagation();
          }}
        >
          {props.editor ?? <LiveDemoEditor />}
        </Panel>

        <PanelResizeHandle className={styles.resizeHandle} />

        <Panel
          id="preview"
          className={classes?.previewPanel}
          defaultSize={defaultPanelSizes.preview}
          order={isVertical ? 0 : 1}
        >
          {props.preview ?? <LiveDemoPreview />}
        </Panel>
      </PanelGroup>
    </div>
  );
};
