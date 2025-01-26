import "../dist/web/index.css";
import {
  LiveDemoEditor,
  LiveDemoFileTabs,
  LiveDemoPreview,
  LiveDemoProvider,
  LiveDemoResizablePanels,
  type LiveDemoStringifiedProps,
  LiveDemoWrapper,
  // @ts-ignore: triggers missing type declaration error at build time
} from "../dist/web";

const LiveDemo = (props: LiveDemoStringifiedProps) => {
  const editor = (
    <>
      <LiveDemoFileTabs />
      <LiveDemoEditor />
    </>
  );

  const preview = <LiveDemoPreview />;

  return (
    <LiveDemoProvider initialValue={props}>
      <LiveDemoWrapper>
        <LiveDemoResizablePanels editor={editor} preview={preview} />
      </LiveDemoWrapper>
    </LiveDemoProvider>
  );
};

export default LiveDemo;
