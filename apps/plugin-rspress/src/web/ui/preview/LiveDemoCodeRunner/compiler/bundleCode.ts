import { isRelativeImport } from "shared/pathHelpers";
import type { LiveDemoCodeRunnerProps } from "../LiveDemoCodeRunner";
import { pluginBabelTransform } from "./rollup/pluginBabelTransform";
import { pluginBabelTransformImportsExports } from "./rollup/pluginBabelTransformImportsExports";
import { pluginResolveModules } from "./rollup/pluginResolveModules";

type BundleCode = Pick<LiveDemoCodeRunnerProps, "files" | "entryFileName">;

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

	const bundledCode = output[0].code;

	// console.log(bundledCode);

	return bundledCode;
};
