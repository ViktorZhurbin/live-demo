import path from "node:path";
import { fileURLToPath } from "node:url";

import type { RspressPlugin } from "@rspress/core";
import { pluginVirtualModule } from "rsbuild-plugin-virtual-module";
import type { ModuleCache } from "~node/helpers/analyzeModule";
import { getVirtualModulesCode } from "~node/helpers/getVirtualModulesCode";
import { remarkPlugin } from "~node/remarkPlugin";
import { visitFilePaths } from "~node/visitFilePaths";
import type { LiveDemoPluginOptions } from "~shared/types";

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
const defaultModules = ["react", "react/jsx-runtime"];

export const liveDemoPluginRspress = (
	options?: LiveDemoPluginOptions,
): RspressPlugin => {
	const uniqueImports = new Set(defaultModules);

	// Per plugin-instance, not module-level (see `analyzeModule.ts`'s
	// docblock) — populated once by the scan, hit again by every remark
	// compile after that.
	const moduleCache: ModuleCache = new Map();

	// Injected per-page by remarkPlugin instead of registered as a global
	// component, so only pages with a demo pull in the demo runtime graph.
	const layoutPath = path.join(__dirname, "../static/LiveDemo.tsx");

	// Tracks `config.root`. The CLI (`rspress dev`/`build`) keeps its own
	// `docDirectory` equal to `config.root`, which is what @rspress/core's
	// `remarkFileCodeBlock` actually reads for the `/`-prefixed form of
	// `file=` — so under the CLI, this resolves against the same directory
	// core does. (Only diverges from a programmatic `dev({ docDirectory,
	// config })` call where `docDirectory !== config.root`, which the CLI
	// itself never does.) The `config` hook always runs before
	// `routeGenerated` (core calls `pluginDriver.modifyConfig()` before
	// `routeGenerated()` in both `dev.js` and `build.js`), so this is
	// populated by the time it's read below. The default here only matters
	// for direct callers of `visitFilePaths` (tests).
	let docRoot = path.resolve("docs");

	return {
		name: "@live-demo/rspress",

		config(config) {
			docRoot = path.resolve(config.root ?? "docs");
			return config;
		},

		async routeGenerated(routes) {
			const filePaths = routes.map((route) => route.absolutePath);

			visitFilePaths({
				filePaths: filePaths,
				uniqueImports,
				docRoot,
				moduleCache,
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
				[
					remarkPlugin,
					{
						layoutPath,
						options: options?.ui,
						// Getter, not a value — see `getDocRoot`'s docblock on
						// `RemarkPluginProps` in `remarkPlugin.ts` for why.
						getDocRoot: () => docRoot,
						moduleCache,
					},
				],
			],
		},
	};
};
