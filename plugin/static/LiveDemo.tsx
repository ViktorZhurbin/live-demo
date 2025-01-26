import "../dist/web/index.css";
import {
	LiveDemoEditor,
	LiveDemoFileTabs,
	LiveDemoPreview,
	LiveDemoProvider,
	LiveDemoResizablePanels,
	type LiveDemoStringifiedProps,
	LiveDemoWrapper,
	parseProps,
	// @ts-ignore: triggers missing type declaration error at build time
} from "../dist/web";

const LiveDemo = (props: LiveDemoStringifiedProps) => {
	const parsedProps = parseProps(props);

	const editor = (
		<>
			<LiveDemoFileTabs />
			<LiveDemoEditor />
		</>
	);

	const preview = <LiveDemoPreview />;

	return (
		<LiveDemoProvider initialValue={parsedProps}>
			<LiveDemoWrapper>
				<LiveDemoResizablePanels editor={editor} preview={preview} />
			</LiveDemoWrapper>
		</LiveDemoProvider>
	);
};

export default LiveDemo;
