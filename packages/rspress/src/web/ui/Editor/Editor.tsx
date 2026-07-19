import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror, {
	EditorView,
	type ReactCodeMirrorProps,
} from "@uiw/react-codemirror";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";
import { useActiveCode } from "~web/hooks/useActiveCode";
import { useLocalStorageWrapCode } from "~web/hooks/useLocalStorage";

import "./Editor.css";

/**
 * Props passed to ReactCodeMirror.
 *
 * @defaultValue
 * ```
 * {
 *    basicSetup: {
 *      lineNumbers: false,
 *      foldGutter: false,
 *      autocompletion: false,
 *      tabSize: 2,
 *    }
 * }
 * ```
 */
interface EditorProps extends ReactCodeMirrorProps {}

export const Editor = (props: EditorProps) => {
	const { options, isDark } = useLiveDemoContext();
	// Spread, not Object.assign: `options` is memoized in LiveDemoProvider, so
	// assigning into it would write this instance's props into the shared
	// plugin-level options every other demo reads.
	const mergedOptions = { ...options?.editor, ...props };

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
			{...mergedOptions}
		/>
	);
};
