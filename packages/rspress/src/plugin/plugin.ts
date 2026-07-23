import path from "node:path";
import { fileURLToPath } from "node:url";

import type { RspressPlugin } from "@rspress/core";
import { pluginVirtualModule } from "rsbuild-plugin-virtual-module";
import { getVirtualModulesCode } from "~node/helpers/getVirtualModulesCode";
import { remarkPlugin } from "~node/remarkPlugin";
import { visitFilePaths } from "~node/visitFilePaths";
import type { DemoDataByRef, LiveDemoPluginOptions } from "~shared/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Included by default for every demo
 *
 * `react/jsx-runtime` is what Sucrase's automatic JSX runtime emits an import
 * for (see `transformCode.ts`). Demo authors never write that import
 * themselves, so it can't be discovered by scanning their code the way other
 * externals are — it has to be here, or every JSX demo fails to resolve it.
 **/
const defaultModules = ["react", "react/jsx-runtime", "@rspress/core/theme"];

export const liveDemoPluginRspress = (
	options?: LiveDemoPluginOptions,
): RspressPlugin => {
	const { includeModules } = options ?? {};

	const demoDataByRef: DemoDataByRef = {};

	const extraModules = includeModules || [];
	const uniqueImports = new Set(defaultModules.concat(extraModules));

	// Injected per-page by remarkPlugin instead of registered as a global
	// component, so only pages with a demo pull in the demo runtime graph.
	const layoutPath = path.join(__dirname, "../static/LiveDemo.tsx");

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
