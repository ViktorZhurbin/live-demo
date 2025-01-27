import "../dist/web/index.css";
import { useFullscreen } from "@mantine/hooks";
import {
  LiveDemoControlPanel,
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
  const fullscreen = useFullscreen();

  const editor = (
    <>
      <LiveDemoFileTabs />
      <LiveDemoEditor />
    </>
  );

  const preview = <LiveDemoPreview />;

  return (
    <LiveDemoProvider initialValue={props}>
      <LiveDemoWrapper ref={fullscreen.ref}>
        <LiveDemoControlPanel fullscreen={fullscreen} />
        <LiveDemoResizablePanels editor={editor} preview={preview} />
      </LiveDemoWrapper>
    </LiveDemoProvider>
  );
};

export default LiveDemo;
