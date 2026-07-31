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
 * The route list isn't the whole set of MDX files that get compiled: core
 * excludes `_`-prefixed files from routing (`excludeConvention`) but its MDX
 * rule matches any imported `.mdx`, so a demo living in a partial is
 * transformed like any other while never appearing here. Since
 * `routeGenerated` fires once per process, that would leave such a demo's
 * externals out of the virtual module permanently — not even a restart would
 * fix it. So the walk follows each page's own `.mdx` imports (see
 * `getMdxPartialImports`), transitively.
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
import fs from "node:fs";
import path from "node:path";

import { getNodeAttribute } from "@rspress/core";
import type { MdxjsEsm, MdxJsxFlowElement } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import { isAllowedExt, isRelativeImport } from "~shared/pathHelpers";
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
	// Grows as `.mdx` imports are discovered; `for...of` picks up entries
	// appended during iteration, same shape as `collectDemoFiles`'s own walk.
	const queue = filePaths.filter((filePath) => filePath.endsWith(".mdx"));
	const visited = new Set(queue);

	for (const mdxRoutePath of queue) {
		const mdxAst = getMdxAst(mdxRoutePath);
		const docDirname = path.dirname(mdxRoutePath);

		visit(mdxAst, "mdxjsEsm", (node: MdxjsEsm) => {
			for (const importPath of getMdxPartialImports(node)) {
				const absolutePath = path.resolve(docDirname, importPath);

				// A missing partial isn't this scan's error to raise: the page's
				// own MDX compile fails on it with the bundler's message.
				if (visited.has(absolutePath) || !fs.existsSync(absolutePath)) {
					continue;
				}

				visited.add(absolutePath);
				queue.push(absolutePath);
			}
		});

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

/**
 * Relative `.mdx` specifiers a page imports — the partials whose demos would
 * otherwise never be scanned (see module docblock). Only `import` statements:
 * a partial is rendered as a component, never re-exported. `.md` is left out
 * on purpose, since a demo injects JSX and so only works in `.mdx`.
 *
 * Relative only, matching the rest of the plugin: no bundler alias is resolved
 * anywhere here, so a partial imported as `@/x.mdx` isn't followed — the same
 * reason an aliased import inside a demo file reads as an external package
 * (`collectDemoFiles.ts`).
 */
function getMdxPartialImports(node: MdxjsEsm): string[] {
	const body = node.data?.estree?.body ?? [];

	return body
		.filter((statement) => statement.type === "ImportDeclaration")
		.map((statement) => statement.source.value)
		.filter(
			(value) =>
				typeof value === "string" &&
				value.endsWith(".mdx") &&
				isRelativeImport(value),
		) as string[];
}
