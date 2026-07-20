import path from "node:path";
import { fileURLToPath } from "node:url";

import type { RspressPlugin } from "@rspress/core";
import { pluginVirtualModule } from "rsbuild-plugin-virtual-module";
import { getVirtualModulesCode } from "~node/helpers/getVirtualModulesCode";
import { remarkPlugin } from "~node/remarkPlugin";
import { visitFilePaths } from "~node/visitFilePaths";
import { LiveDemoError } from "~shared/errors";
import type { DemoDataByRef, LiveDemoPluginOptions } from "~shared/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LiveDemoPluginRspressOptions = LiveDemoPluginOptions & {
	/**
	 * Path to custom layout file.
	 * `remarkPlugin` imports it into each page that has at least one demo, so
	 * only those pages reference the demo runtime (not the whole site).
	 *
	 * The file has to have a default export.
	 * Path needs to end with `LiveDemo.(jsx?|tsx)`.
	 *
	 * @example
	 * path.join(__dirname, "src/CustomLiveDemo/LiveDemo.tsx")
	 **/
	customLayout?: string;
};

/**
 * Included by default for every demo
 *
 * `react/jsx-runtime` is what Babel's automatic JSX runtime emits an import
 * for (see `babelTransformCode.ts`). Demo authors never write that import
 * themselves, so it can't be discovered by scanning their code the way other
 * externals are — it has to be here, or every JSX demo fails to resolve it.
 **/
const defaultModules = ["react", "react/jsx-runtime", "@rspress/core/theme"];

export const liveDemoPluginRspress = (
	options?: LiveDemoPluginRspressOptions,
): RspressPlugin => {
	const { customLayout, includeModules } = options ?? {};

	if (customLayout && !/LiveDemo\.(jsx?|tsx)$/.test(customLayout)) {
		throw new LiveDemoError("INVALID_CUSTOM_LAYOUT", { customLayout });
	}

	const demoDataByRef: DemoDataByRef = {};

	const extraModules = includeModules || [];
	const uniqueImports = new Set(defaultModules.concat(extraModules));

	// Injected per-page by remarkPlugin instead of registered as a global
	// component, so only pages with a demo pull in the demo runtime graph.
	const layoutPath =
		customLayout ?? path.join(__dirname, "../static/LiveDemo.tsx");

	return {
		name: "@live-demo/rspress",

		async routeGenerated(routes) {
			const filePaths = routes.map((route) => route.absolutePath);

			visitFilePaths({
				filePaths: filePaths,
				uniqueImports,
				demoDataByRef,
			});
		},

		builderConfig: {
			plugins: [
				pluginVirtualModule({
					virtualModules: {
						_live_demo_virtual_modules: () =>
							getVirtualModulesCode(uniqueImports),
					},
				}),
			],
		},

		markdown: {
			remarkPlugins: [
				[remarkPlugin, { demoDataByRef, layoutPath, options: options?.ui }],
			],
		},
	};
};
