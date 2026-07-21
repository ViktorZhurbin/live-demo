import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror, { EditorView } from "@uiw/react-codemirror";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";
import { useActiveCode } from "~web/hooks/useActiveCode";
import { useLocalStorageWrapCode } from "~web/hooks/useLocalStorage";

import "./Editor.css";

export const Editor = () => {
	const { options, isDark } = useLiveDemoContext();

	const theme = isDark ? vscodeDark : vscodeLight;
	const { code, updateCode } = useActiveCode();
	const [lineWrap] = useLocalStorageWrapCode();

	return (
		<ReactCodeMirror
			value={code}
			onChange={updateCode}
			theme={theme}
			extensions={[
				lineWrap ? EditorView.lineWrapping : [],
				javascript({ jsx: true, typescript: true }),
			]}
			basicSetup={{
				lineNumbers: false,
				foldGutter: false,
				autocompletion: false,
				tabSize: 2,
			}}
			{...options?.editor}
		/>
	);
};
