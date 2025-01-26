import { javascript } from "@codemirror/lang-javascript";
import { useDark } from "@rspress/core/runtime";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror from "@uiw/react-codemirror";
import { useActiveCode } from "web/hooks/useActiveCode";
import "./LiveDemoEditor.css";

export const LiveDemoEditor = () => {
	const theme = useDark() ? vscodeDark : vscodeLight;
	const { code, updateCode } = useActiveCode();

	return (
		<ReactCodeMirror
			value={code}
			onChange={updateCode}
			extensions={[javascript({ jsx: true, typescript: true })]}
			theme={theme}
			basicSetup={{
				lineNumbers: false,
				foldGutter: false,
				autocompletion: false,
				tabSize: 2,
			}}
		/>
	);
};