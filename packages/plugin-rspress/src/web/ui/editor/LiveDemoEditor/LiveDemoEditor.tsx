import { javascript } from "@codemirror/lang-javascript";
import { useDark } from "@rspress/core/runtime";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import ReactCodeMirror, {
  EditorView,
  type ReactCodeMirrorProps,
} from "@uiw/react-codemirror";
import { useLiveDemoContext } from "web/context";
import { useActiveCode } from "web/hooks/useActiveCode";
import { useLocalStorageWrapCode } from "web/hooks/useLocalStorage";
import "./LiveDemoEditor.css";

/**
 * Props passed to ReactCodeMirror.
 *
 * @defaultValue
 * ```
 * {
 *    basicSetup: {
        lineNumbers: false,
        foldGutter: false,
        autocompletion: false,
        tabSize: 2,
      }
 * }
 * ```
 */
export interface LiveDemoEditorProps extends ReactCodeMirrorProps {}

export const LiveDemoEditor = (props: LiveDemoEditorProps) => {
  const { options } = useLiveDemoContext();
  const mergedOptions = Object.assign(options?.editor ?? {}, props);

  const theme = useDark() ? vscodeDark : vscodeLight;
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
