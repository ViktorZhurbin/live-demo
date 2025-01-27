// don't forget CSS!
import "@live-demo/core/web/index.css";
import {
  LiveDemoControlPanel,
  LiveDemoEditor,
  LiveDemoFileTabs,
  LiveDemoPreview,
  LiveDemoProvider,
  LiveDemoResizablePanels,
  type LiveDemoStringifiedProps,
  LiveDemoWrapper,
} from "@live-demo/core/web";
import { useDark } from "rspress/runtime";

const CustomLiveDemo = (props: LiveDemoStringifiedProps) => {
  // the core library doesn't have Rspress context,
  // so we need to let it know when to use dark or light mode
  const isDark = useDark();

  // moved file tabs to bottom
  const editor = (
    <>
      <LiveDemoEditor />
      <LiveDemoFileTabs />
    </>
  );

  // add custom styles, wrappers, elements, etc.
  const preview = (
    <>
      <LiveDemoPreview />
    </>
  );

  return (
    <LiveDemoProvider pluginProps={props} isDark={isDark}>
      <LiveDemoWrapper>
        <LiveDemoResizablePanels editor={editor} preview={preview} />
        {/*  */}
        <LiveDemoControlPanel />
      </LiveDemoWrapper>
    </LiveDemoProvider>
  );
};

// needs to be a default export
export default CustomLiveDemo;
