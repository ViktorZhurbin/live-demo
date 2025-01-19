import type { CodeRunnerProps } from "../CodeRunner";
import { getBabelTransformedFiles } from "./getBabelTransformedFiles";
import { getComponentFnFromCodeString } from "./getFnFromFunctionString";
import { getRollupBundledCode } from "./getRollupBundledCode";

type CompileComponentFromFiles = Pick<
	CodeRunnerProps,
	"files" | "entryFileName"
>;

export const compileComponentFromFiles = async ({
	files,
	entryFileName,
}: CompileComponentFromFiles) => {
	if (!(window.Babel || window.rollup)) return;

	// Rollup requires plugins to handle JSX/TSX,
	// but they don't work in the browser.
	// Using @babel/standalone to transform JSX/TSX into JS
	const babelTransformedFiles = getBabelTransformedFiles({ files });

	// Bundle files into a single chunk
	const bundledCode = await getRollupBundledCode({
		entryFileName,
		files: babelTransformedFiles,
	});

	return getComponentFnFromCodeString(bundledCode);
};
