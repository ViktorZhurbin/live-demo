/**
 * Remark plugin that rewrites MDX code blocks/elements into LiveDemo components,
 * using demo data `visitFilePaths` already collected during the earlier scan phase:
 * 1. External demos: ```tsx file="./Component.tsx" live → <LiveDemo files={...} />
 * 2. Inline demos: ```jsx live → <LiveDemo files={{App.jsx: "..."}} />
 * 3. Deprecated: <code src="./Component.tsx" /> → same as (1), see its own branch below.
 */
import { getNodeAttribute } from "@rspress/core";
import type { Code, Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { isAllowedExt } from "~shared/pathHelpers";
import type {
	DemoDataByRef,
	LiveDemoPluginOptions,
	LiveDemoPropsFromPlugin,
} from "~shared/types";

import { createLayoutImportNode } from "./helpers/createLayoutImportNode";
import { demoRefKey } from "./helpers/demoRefKey";
import { parseCodeMeta } from "./helpers/parseCodeMeta";
import { warnOnce } from "./helpers/warnOnce";

type RemarkPluginProps = {
	options?: LiveDemoPluginOptions["ui"];
	demoDataByRef: DemoDataByRef; // Analyzed demo files
	layoutPath: string; // Layout component to import into pages that use a demo
};

// Mangled so the per-page `import` this plugin injects can't collide with a
// binding the page's own author already has in scope. Both transforms emit
// this as the JSX element name; `createLayoutImportNode` binds it.
const LIVE_DEMO_NAME = "_LiveDemo";

export const remarkPlugin: Plugin<[RemarkPluginProps], Root> = ({
	options,
	demoDataByRef,
	layoutPath,
}) => {
	return (tree, vfile) => {
		let transformed = false;

		// Transform: fenced code blocks carrying the bare `live` word in their
		// meta. `file="..."` alongside it is an external demo; its absence makes
		// it inline. A `file=` block *without* `live` is left alone entirely —
		// core still renders it as a plain, non-interactive file code block.
		// No top-level `node.lang` gate here (unlike the old code): it would
		// gate the external branch on something the scan half (visitFilePaths.ts)
		// doesn't check, unlike the inline branch below, which already re-checks
		// it itself.
		visit(tree, "code", (node) => {
			const { file, isLive } = parseCodeMeta(node.meta);
			if (!isLive) return;

			if (file) {
				transformExternalDemo(node, file, vfile.path);
			} else {
				transformInlineDemo(node);
			}
		});

		// Deprecated: <code src="./Component.tsx" />. Routes through the same
		// demoDataByRef lookup as the `file=` branch above, keyed the same way
		// (see `demoRefKey`). Removed in a later major — see visitFilePaths.ts's
		// matching branch.
		visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
			if (node.name !== "code") return;

			const src = getNodeAttribute(node, "src");
			if (typeof src !== "string") return;

			const refKey = demoRefKey(vfile.path, src);

			warnOnce(
				refKey,
				`[live-demo] <code src="${src}"> is deprecated. Use a fenced code block ` +
					`with \`file="${src}" live\` instead. <code src> will be removed in a future major version.`,
			);

			const demoData = demoDataByRef[refKey];

			// See the identical comment in transformExternalDemo below — same
			// cause (routeGenerated runs once per dev-server process).
			if (!demoData) {
				console.warn(
					`[live-demo] No demo data for <code src="${src}"> in ${vfile.path}.\n` +
						"It will render as an empty <code> element. Restart the dev server to pick it up.",
				);
				return;
			}

			const props = getPropsWithOptions(demoData, options);

			Object.assign(node, {
				type: "mdxJsxFlowElement",
				name: LIVE_DEMO_NAME,
				attributes: getJsxAttributesFromProps(props),
			});
			transformed = true;
		});

		function transformExternalDemo(
			node: Code,
			file: string,
			vfilePath: string,
		) {
			const demoData = demoDataByRef[demoRefKey(vfilePath, file)];

			// Missing means the scan never recorded it: `routeGenerated` runs once
			// per dev server process, so adding a new demo to an already-routed
			// page triggers this recompile without rescanning. The node is left
			// alone, which renders as a plain file code block (core has already
			// substituted `node.value` with the file's contents) — not obviously
			// broken, hence the warning.
			//
			// `console.warn`, not `vfile.message`: rspress's MDX pipeline collects
			// vfile messages but never prints them, so that route is silent in
			// practice.
			if (!demoData) {
				console.warn(
					`[live-demo] No demo data for \`file="${file}"\` in ${vfilePath}.\n` +
						"It will render as a plain file code block. Restart the dev server to pick it up.",
				);
				return;
			}

			// @rspress/core's own remarkFileCodeBlock (registered before this
			// plugin — see @rspress/core's mdx/options.js) runs on every MDX
			// recompile and re-reads the file into `node.value`, while
			// `demoData.files` was populated once, whenever routeGenerated last
			// scanned. Overriding just the entry's slot with the fresh value
			// fixes the common dev-mode case: editing a demo's entry file without
			// touching its imports. Files it imports aren't re-read here — those
			// still need a dev-server restart (see the package's CLAUDE.md).
			//
			// `node.value` is empty in this plugin's own unit tests, which parse
			// MDX without running core's remarkFileCodeBlock — the `?` falls back
			// to the scan's own content in that case.
			const files = node.value
				? { ...demoData.files, [demoData.entryFileName]: node.value }
				: demoData.files;

			const props = getPropsWithOptions({ ...demoData, files }, options);

			Object.assign(node, {
				type: "mdxJsxFlowElement",
				name: LIVE_DEMO_NAME,
				attributes: getJsxAttributesFromProps(props),
			});
			transformed = true;
		}

		// No file collection here, unlike the external transform: an inline
		// demo is its own single file. The packages it imports are picked up
		// separately, by `collectInlineImports` during the scan, so they reach
		// the virtual module the same way an external demo's do.
		//
		// What still can't work is an import *typed at runtime* that no demo
		// declared anywhere: the consuming bundler has to see every specifier
		// statically to build the virtual module, so that throws
		// `EXTERNAL_IMPORT_NOT_FOUND` at evaluation instead of resolving.
		// Documented at `website/docs/guide/usage.mdx`.
		function transformInlineDemo(node: Code) {
			if (!node.lang || !isAllowedExt(node.lang)) return;

			const entryFileName = `App.${node.lang}`;
			const baseProps = {
				entryFileName,
				files: { [entryFileName]: node.value },
			};

			const props = getPropsWithOptions(baseProps, options);

			Object.assign(node, {
				type: "mdxJsxFlowElement",
				name: LIVE_DEMO_NAME,
				attributes: getJsxAttributesFromProps(props),
			});
			transformed = true;
		}

		// Import the layout only into pages that actually rendered a demo, so
		// non-demo pages never reference the runtime graph.
		if (transformed) {
			tree.children.unshift(createLayoutImportNode(layoutPath, LIVE_DEMO_NAME));
		}
	};
};

function getPropsWithOptions(
	props: LiveDemoPropsFromPlugin,
	options?: LiveDemoPluginOptions["ui"],
) {
	return options ? { ...props, options } : props;
}

/**
 * {files: {...}, entryFileName: "App.tsx"}
 * → [{name: "files", value: "{...}", type: "mdxJsxAttribute"}, ...]
 */
function getJsxAttributesFromProps(
	props: LiveDemoPropsFromPlugin,
): MdxJsxFlowElement["attributes"] {
	return Object.entries(props).map(([name, value]) => ({
		name,
		value: JSON.stringify(value),
		type: "mdxJsxAttribute",
	}));
}
