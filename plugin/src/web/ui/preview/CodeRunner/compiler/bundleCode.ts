import type rollup from "@rollup/browser";
import { isRelativeImport } from "@shared/pathHelpers";
import type { CodeRunnerProps } from "../CodeRunner";
import { pluginBabelGetImports } from "./rollup/pluginBabelGetImports";
import { pluginBabelTransform } from "./rollup/pluginBabelTransform";
import { pluginResolveModules } from "./rollup/pluginResolveModules";

type Rollup = typeof rollup;

// rollup is loaded with html script tag
// see builderConfig.html.tags in pluginPlayground
declare global {
	interface Window {
		rollup: Rollup;
	}
}

type BundleCode = Pick<CodeRunnerProps, "files" | "entryFileName">;

export const bundleCode = async ({ files, entryFileName }: BundleCode) => {
	const bundle = await window.rollup.rollup({
		input: entryFileName,
		plugins: [
			pluginResolveModules(files),
			pluginBabelTransform(),
			pluginBabelGetImports(),
		],
		external: (source) => {
			const isResolvable = isRelativeImport(source) || files[source];

			return !isResolvable;
		},
	});

	const { output } = await bundle.generate({
		compact: false,
		exports: "default",
	});

	const bundledCode = output[0].code;

	// console.log(bundledCode);

	return bundledCode;
};
