/**
 * Scans MDX files for demo references and folds each one's external imports
 * into `uniqueImports`, so the virtual module (`getVirtualModulesCode.ts`,
 * built once at plugin-config time) can resolve them. Runs in the
 * `routeGenerated` hook — once per dev-server process — before any MDX
 * compile.
 *
 * `files`/`entryFileName` are *not* kept here even though `collectDemoFiles`
 * computes them anyway: `remarkPlugin` resolves the same reference and walks
 * the same graph again, synchronously, on every MDX compile, which is what
 * keeps a demo's files fresh across dev-mode recompiles (see its docblock).
 * `analyzeModule`'s cache is what keeps that affordable.
 *
 * Two syntaxes reach this scan. The canonical one is a fenced code block
 * carrying both `file="..."` and the bare word `live` in its meta — the same
 * `file=` meta @rspress/core's own `remarkFileCodeBlock` reads, which is why
 * `resolvePrefixedPath` mirrors its prefix rules: this scan is a *separate*
 * MDX parse from core's real compile, so if the two disagreed on what a path
 * resolves to, a page could build against one file while this scan collected
 * another. The second, deprecated syntax is `<code src="...">`, kept working
 * as a thin alias (see the second `visit` call below and `remarkPlugin.ts`'s
 * matching branch). Inline ` ```lang live ` blocks carry no file to resolve,
 * so they collect no *files* here, but their source is still parsed for the
 * packages it imports (`collectInlineImports`) — otherwise those packages
 * would never reach the virtual module. `remarkPlugin` handles everything
 * else about them.
 */
import path from "node:path";

import { getNodeAttribute } from "@rspress/core";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import { isAllowedExt } from "~shared/pathHelpers";
import type { PathWithAllowedExt, UniqueImports } from "~shared/types";

import type { ModuleCache } from "./helpers/analyzeModule";
import { collectDemoFiles } from "./helpers/collectDemoFiles";
import { collectInlineImports } from "./helpers/collectInlineImports";
import { getMdxAst } from "./helpers/getMdxAst";
import { parseCodeMeta } from "./helpers/parseCodeMeta";
import { resolveFileInfo } from "./helpers/resolveFileInfo";
import { resolveFileMetaEntry } from "./helpers/resolveFileMetaEntry";

export const visitFilePaths = ({
	filePaths,
	uniqueImports,
	docRoot,
	moduleCache,
}: {
	filePaths: string[];
	uniqueImports: UniqueImports;
	/** Resolved doc root (mirrors `config.root`), for the `/`-prefixed `file=` form. */
	docRoot: string;
	moduleCache: ModuleCache;
}) => {
	for (const mdxRoutePath of filePaths) {
		if (!mdxRoutePath.endsWith(".mdx")) continue;

		const mdxAst = getMdxAst(mdxRoutePath);
		const docDirname = path.dirname(mdxRoutePath);

		// Shared by both syntaxes below: walk the entry's module graph and fold
		// only its externals into the sitewide set. `files` is discarded — see
		// module docblock for why `remarkPlugin` re-walks this same graph.
		const collectExternals = (absolutePath: PathWithAllowedExt) => {
			const { externalImports } = collectDemoFiles({
				absolutePath,
				mdxPath: mdxRoutePath,
				moduleCache,
			});

			for (const externalImport of externalImports) {
				uniqueImports.add(externalImport);
			}
		};

		visit(mdxAst, "code", (node) => {
			const { file, isLive } = parseCodeMeta(node.meta);
			if (!isLive) return;

			// Inline block: nothing to resolve or read, but the packages it
			// imports still have to reach the virtual module, so its source is
			// parsed in place (see `collectInlineImports`). The language gate
			// mirrors `remarkPlugin`'s `transformInlineDemo` — the scan and the
			// transform must agree on which fences count as inline demos.
			if (!file) {
				if (!node.lang || !isAllowedExt(node.lang)) return;

				for (const inlineImport of collectInlineImports({
					code: node.value,
					lang: node.lang,
				})) {
					uniqueImports.add(inlineImport);
				}
				return;
			}

			const entryFile = resolveFileMetaEntry({
				file,
				docDirname,
				docRoot,
				mdxPath: mdxRoutePath,
			});

			collectExternals(entryFile.absolutePath);
		});

		// Deprecated: `<code src="...">` predates the `file=` meta syntax and
		// only ever resolves `./`/`../`-relative to the MDX file, unlike the
		// prefixes above. Removed in a later major.
		visit(mdxAst, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
			if (node.name !== "code") return;

			const src = getNodeAttribute(node, "src");
			if (typeof src !== "string") return;

			const entryFile = resolveFileInfo({
				importPath: src,
				dirname: docDirname,
				importer: mdxRoutePath,
				mdxPath: mdxRoutePath,
			});

			collectExternals(entryFile.absolutePath);
		});
	}
};
