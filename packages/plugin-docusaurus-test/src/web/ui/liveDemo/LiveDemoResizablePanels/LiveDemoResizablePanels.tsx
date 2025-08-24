import { useElementSize } from "@mantine/hooks";
import clsx from "clsx";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { PanelsView } from "web/constants/settings";
import { useLiveDemoContext } from "web/context";
import { useLocalStorageView } from "web/hooks/useLocalStorage";
import { LiveDemoEditor, LiveDemoFileTabs } from "web/ui";
import { LiveDemoPreview } from "web/ui/preview";
import styles from "./LiveDemoResizablePanels.module.css";
import type { LiveDemoResizablePanelsProps } from "./types";

export const LiveDemoResizablePanels = (
  props: LiveDemoResizablePanelsProps,
) => {
  const { options } = useLiveDemoContext();
  const mergedOptions = Object.assign(options?.resizablePanels ?? {}, props);

  const {
    classes,
    autoSaveId,
    verticalThreshold = 550,
    defaultPanelSizes = { editor: 50, preview: 50 },
  } = mergedOptions;

  const [panelsView] = useLocalStorageView();

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

  return (
    <div className={wrapperClass} ref={wrapperSize.ref}>
      <PanelGroup
        autoSaveId={autoSaveId}
        style={{ flexDirection: isVertical ? "column-reverse" : "row" }}
        direction={isVertical ? "vertical" : "horizontal"}
      >
        {/** biome-ignore lint/correctness/useUniqueElementIds: not applicable */}
        <Panel
          id="editor"
          className={editorClasses}
          defaultSize={defaultPanelSizes.editor}
          order={isVertical ? 1 : 0}
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

        <PanelResizeHandle className={styles.resizeHandle} />

        {/** biome-ignore lint/correctness/useUniqueElementIds: not applicable */}
        <Panel
          id="preview"
          className={previewClasses}
          defaultSize={defaultPanelSizes.preview}
          order={isVertical ? 0 : 1}
        >
          {props.preview ?? <LiveDemoPreview />}
        </Panel>
      </PanelGroup>
    </div>
  );
};
