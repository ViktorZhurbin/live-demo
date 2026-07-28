/**
 * Remark plugin that rewrites MDX code blocks/elements into LiveDemo
 * components. Unlike the build-time scan (`visitFilePaths.ts`), which only
 * needs each demo's externals, this resolves `file="..."`/`<code src>` and
 * walks the full module graph itself (`collectDemoFiles`), synchronously, on
 * every MDX compile — so a demo's `files` are never more than one recompile
 * stale. `analyzeModule`'s cache (see its docblock) spares the repeat reads
 * that walk would otherwise redo.
 * 1. External demos: ```tsx file="./Component.tsx" live → <LiveDemo files={...} />
 * 2. Inline demos: ```jsx live → <LiveDemo files={{App.jsx: "..."}} />
 * 3. Deprecated: <code src="./Component.tsx" /> → same as (1), see its own branch below.
 */
import path from "node:path";

import { getNodeAttribute } from "@rspress/core";
import type { Code, Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { isAllowedExt } from "~shared/pathHelpers";
import type {
	LiveDemoPluginOptions,
	LiveDemoPropsFromPlugin,
} from "~shared/types";

import type { ModuleCache } from "./helpers/analyzeModule";
import { collectDemoFiles } from "./helpers/collectDemoFiles";
import { createLayoutImportNode } from "./helpers/createLayoutImportNode";
import { parseCodeMeta } from "./helpers/parseCodeMeta";
import { resolveFileInfo } from "./helpers/resolveFileInfo";
import { resolveFileMetaEntry } from "./helpers/resolveFileMetaEntry";
import { warnOnce } from "./helpers/warnOnce";

type RemarkPluginProps = {
	options?: LiveDemoPluginOptions["ui"];
	/**
	 * Reads `plugin.ts`'s `docRoot` at transform time rather than taking its
	 * value: `markdown.remarkPlugins` is built once, at plugin-definition
	 * time, before the `config` hook has resolved `docRoot` from `config.root`.
	 * A plain value here would freeze in that pre-`config()` default.
	 */
	getDocRoot: () => string;
	moduleCache: ModuleCache;
	layoutPath: string; // Layout component to import into pages that use a demo
};

// Mangled so the per-page `import` this plugin injects can't collide with a
// binding the page's own author already has in scope. Both transforms emit
// this as the JSX element name; `createLayoutImportNode` binds it.
const LIVE_DEMO_NAME = "_LiveDemo";

export const remarkPlugin: Plugin<[RemarkPluginProps], Root> = ({
	options,
	getDocRoot,
	moduleCache,
	layoutPath,
}) => {
	return (tree, vfile) => {
		let transformed = false;
		const docDirname = path.dirname(vfile.path);

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
				transformExternalDemo(node, file);
			} else {
				transformInlineDemo(node);
			}
		});

		// Deprecated: <code src="./Component.tsx" />. Removed in a later major —
		// see visitFilePaths.ts's matching branch.
		visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
			if (node.name !== "code") return;

			const src = getNodeAttribute(node, "src");
			if (typeof src !== "string") return;

			warnOnce(
				`${vfile.path}\0${src}`,
				`[live-demo] <code src="${src}"> is deprecated. Use a fenced code block ` +
					`with \`file="${src}" live\` instead. <code src> will be removed in a future major version.`,
			);

			// No `node.value` counterpart here: `<code src>` isn't a fenced block,
			// so core's remarkFileCodeBlock never read this file. The walk's own
			// read is the only copy of the entry's content there is.
			emitDemoNode(
				node,
				resolveFileInfo({
					importPath: src,
					dirname: docDirname,
					importer: vfile.path,
					mdxPath: vfile.path,
				}),
			);
		});

		function transformExternalDemo(node: Code, file: string) {
			const entryFile = resolveFileMetaEntry({
				file,
				docDirname,
				docRoot: getDocRoot(),
				mdxPath: vfile.path,
			});

			// @rspress/core's own remarkFileCodeBlock (registered before this
			// plugin — see @rspress/core's mdx/options.js) already re-read this
			// same file into `node.value` by the time this runs, so it's simpler
			// to take that over asking `collectDemoFiles`'s own read to double as
			// the entry's content.
			emitDemoNode(node, entryFile, node.value);
		}

		/**
		 * Walk `entryFile`'s graph and rewrite `node` in place into a
		 * `<LiveDemo>` element. Shared by both external syntaxes, which differ
		 * only in how the reference resolves and whether a fresher copy of the
		 * entry's own content exists to override the walk's (`entryContent`).
		 */
		function emitDemoNode(
			node: Code | MdxJsxFlowElement,
			entryFile: ReturnType<typeof resolveFileInfo>,
			entryContent?: string,
		) {
			const { files, externalImports } = collectDemoFiles({
				absolutePath: entryFile.absolutePath,
				mdxPath: vfile.path,
				moduleCache,
			});

			if (entryContent !== undefined) {
				files[entryFile.fileName] = entryContent;
			}

			const props = getPropsWithOptions(
				{
					entryFileName: entryFile.fileName,
					files,
					externalImports: [...externalImports],
				},
				options,
			);

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
