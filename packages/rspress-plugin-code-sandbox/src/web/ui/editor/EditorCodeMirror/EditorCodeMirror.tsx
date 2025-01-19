import { javascript } from "@codemirror/lang-javascript";
import { useDark } from "@rspress/core/runtime";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";
import "./EditorCodeMirror.css";
import { useFilesContext } from "../../../context/Files";

export const EditorCodeMirror = () => {
	const theme = useDark() ? vscodeDark : vscodeLight;
	const { files, updateFiles } = useFilesContext();

	return (
		<CodeMirror
			value={files["App.tsx"]}
			onChange={(code) => {
				updateFiles({ "App.tsx": code });
			}}
			extensions={[javascript({ jsx: true, typescript: true })]}
			theme={theme}
			basicSetup={{
				lineNumbers: false,
				foldGutter: false,
				autocompletion: false,
			}}
		/>
	);
};
