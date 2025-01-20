import fs from "node:fs";
import path from "node:path";
import type { RspressPlugin } from "@rspress/core";
import type { PlaygroundProps } from "@shared/types";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import { getFilesAndImports } from "./helpers/getFilesAndImports";
import { getMdxAst } from "./helpers/getMdxAst";
import { getMdxJsxAttribute } from "./helpers/getMdxJsxAttribute";
import { getVirtualModulesCode } from "./helpers/getVirtualModulesCode";
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
export function rspressPluginCodePlayground(): RspressPlugin {
	const getDemoDataByPath = () => demoDataByPath;
	// Collect all imports to make them available in browser through
	// the `getImport` getter, injected as a virtual module
	let allImports = new Set(["react"]);

	return {
		name: "rspress-plugin-code-playground",

		config(config) {
			config.markdown = config.markdown || {};
			// disable Rust compiler to use
			// markdown.remarkPlugins and markdown.globalComponents
			// https://rspress.dev/api/config/config-build#markdownglobalcomponents
			config.markdown.mdxRs = false;

			return config;
		},

		async routeGenerated(routes) {
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

						const demo = getFilesAndImports({
							importPath,
							dirname: path.dirname(route.absolutePath),
						});

						allImports = new Set([...allImports, ...demo.imports]);

						demoDataByPath[importPath] = {
							files: demo.files,
							entryFileName: demo.entryFileName,
						};
					});
				} catch (e) {
					console.error(e);
					throw e;
				}
			}
		},

		async addRuntimeModules() {
			return {
				_playground_virtual_modules: getVirtualModulesCode(allImports),
			};
		},

		builderConfig: {
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
					{
						tag: "script",
						head: true,
						attrs: {
							src: "https://cdn.jsdelivr.net/npm/@rollup/browser@4.31.0/dist/rollup.browser.min.js",
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
