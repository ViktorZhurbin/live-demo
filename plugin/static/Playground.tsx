import "../dist/web/index.css";
import {
	EditorCodeMirror,
	FileTabs,
	FilesProvider,
	type PlaygroundStringifiedProps,
	PlaygroundWrapper,
	Preview,
	ResizablePanels,
	parseProps,
	// @ts-ignore: triggers missing type declaration error at build time
} from "../dist/web";

const Playground = (props: PlaygroundStringifiedProps) => {
	const parsedProps = parseProps(props);

	const editor = (
		<>
			<FileTabs />
			<EditorCodeMirror />
		</>
	);

	const preview = <Preview />;

	return (
		<FilesProvider initialValue={parsedProps}>
			<PlaygroundWrapper>
				<ResizablePanels editor={editor} preview={preview} />
			</PlaygroundWrapper>
		</FilesProvider>
	);
};

export default Playground;