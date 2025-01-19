import fs from "node:fs";
import path from "node:path";
import type { RspressPlugin } from "@rspress/core";
import { EntryFiles } from "@shared/constants";
import type { PlaygroundProps } from "@shared/types";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { RspackVirtualModulePlugin } from "rspack-plugin-virtual-module";
import { visit } from "unist-util-visit";
import { getMdxAst } from "./helpers/getMdxAst";
import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";
import { getVirtualModulesCode } from "./helpers/getVirtualModulesCode";
import { parseImports } from "./helpers/parseImports";
import { remarkPlugin } from "./remarkPlugin";

export type DemoDataByPath = Record<string, PlaygroundProps>;

const demoDataByPath: DemoDataByPath = {};

/**
 * Scan all files and:
 * - find nodes of the type `<code src='./path/to/Component.tsx' >`
 * - resolve the file content from the `src` attribute
 * - resolve relative imports inside that file
 * - resolve imported npm modules and inject a getImport getter as a virtual module, which make them available in browser
 * - create `files` object for each demo
 * - Through `remarkPlugin`, replace `<code src='./path/to/Component.tsx' >`
 * with `<Playground files={files} />`
 */
export function pluginPlayground(): RspressPlugin {
	const playgroundVirtualModule = new RspackVirtualModulePlugin({});
	const getDemoDataByPath = () => demoDataByPath;

	return {
		name: "@rspress/plugin-playground",

		config(config) {
			config.markdown = config.markdown || {};
			// disable Rust compiler to use
			// markdown.remarkPlugins and markdown.globalComponents
			// https://rspress.dev/api/config/config-build#markdownglobalcomponents
			config.markdown.mdxRs = false;

			return config;
		},

		async routeGenerated(routes) {
			// Collect all imports to make them available in browser through
			// the `getImport` getter, injected as a virtual module
			const allImports: Record<string, string> = { react: "react" };

			// Scan all MDX files
			for (const route of routes) {
				if (!route.absolutePath.endsWith(".mdx")) continue;

				try {
					const mdxAst = getMdxAst(route.absolutePath);

					// Find files containing `<code src='./path/to/Demo.tsx' />`,
					visit(mdxAst, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
						if (node.name !== "code") return;

						const importPath = getMdxJsxAttribute(node, "src");

						if (typeof importPath !== "string") return;

						if (!/.(j|t)sx$/.test(importPath)) {
							throw new Error(
								`Invalid src import path: ${importPath}. Check extension: only .jsx and .tsx file extensions are supported`
							);
						}

						const demoPath = path.join(
							path.dirname(route.absolutePath),
							importPath
						);

						if (!fs.existsSync(demoPath)) return;

						const code = fs.readFileSync(demoPath, {
							encoding: "utf8",
						});

						demoDataByPath[importPath] = {
							files: { [EntryFiles.tsx]: code },
						};

						const demoImports = parseImports(code, path.extname(importPath));

						Object.assign(allImports, demoImports);
					});
				} catch (e) {
					console.error(e);
					throw e;
				}
			}

			playgroundVirtualModule.writeModule(
				"_playground_virtual_modules",
				getVirtualModulesCode(allImports)
			);
		},

		// Add additional runtime modules
		async addRuntimeModules(config, isProd) {
			return {
				// _playground_virtual_types: `export default ${JSON.stringify(typesMap)}`,
			};
		},

		builderConfig: {
			tools: {
				rspack: {
					plugins: [playgroundVirtualModule],
				},
			},
			html: {
				tags: [
					{
						// Babel is quite heavy, so we load it as a script tag
						tag: "script",
						head: true,
						attrs: {
							src: "https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js",
							integrity: "sha256-oShy6o2j0psqKWxRv6x8SC6BQZx1XyIHpJrZt3IA9Oo=",
							crossorigin: "anonymous",
						},
					},
				],
			},
		},

		markdown: {
			remarkPlugins: [[remarkPlugin, { getDemoDataByPath }]],
			// Perhaps we can move this to `remarkPlugin`
			// to add it only when there's <code src"" />
			// Not sure how `globalComponents` works, actually
			globalComponents: [path.join(__dirname, "../web/ui/playground")],
		},
	};
}
