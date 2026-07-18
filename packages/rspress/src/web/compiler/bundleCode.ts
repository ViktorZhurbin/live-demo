import { isRelativeImport } from "~shared/pathHelpers";
import type { CodeRunnerProps } from "~web/ui/CodeRunner/CodeRunner";

import { pluginBabelTransform } from "./rollup/pluginBabelTransform";
import { pluginBabelTransformImportsExports } from "./rollup/pluginBabelTransformImportsExports";
import { pluginResolveModules } from "./rollup/pluginResolveModules";

type BundleCode = Pick<CodeRunnerProps, "files" | "entryFileName">;

export const bundleCode = async ({ files, entryFileName }: BundleCode) => {
	const bundle = await window.rollup.rollup({
		input: entryFileName,
		plugins: [
			pluginResolveModules(files),
			pluginBabelTransform(),
			pluginBabelTransformImportsExports(),
		],
		external: (source) => {
			const isResolvable = isRelativeImport(source) || files[source];

			return !isResolvable;
		},
	});

	const { output } = await bundle.generate({
		generatedCode: "es2015",
	});

	return output[0].code;
};
