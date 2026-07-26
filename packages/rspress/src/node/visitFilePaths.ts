/**
 * Scans MDX files for demo references and, for each one, collects its files
 * and external imports. Runs before MDX compilation, once per build —
 * reading files off disk only happens here. `remarkPlugin` reads the results
 * back out by path in a later phase.
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
 *
 * `file=`'s path also can't be extensionless, unlike `<code src>`:
 * `resolveFileInfo`'s own extension-guessing would happily resolve one, but
 * core's real `remarkFileCodeBlock` reads `file=` literally off disk with no
 * such guessing, so an extensionless `file=` would pass this scan and then
 * fail MDX compilation with an unrelated ENOENT. Rejected explicitly, below,
 * before it reaches `resolveFileInfo`.
 */
import path from "node:path";

import { getNodeAttribute } from "@rspress/core";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import { LiveDemoError } from "~shared/errors";
import { getFileExt, isAllowedExt } from "~shared/pathHelpers";
import type { DemoDataByRef, UniqueImports } from "~shared/types";

import { collectDemoFiles } from "./helpers/collectDemoFiles";
import { collectInlineImports } from "./helpers/collectInlineImports";
import { demoRefKey } from "./helpers/demoRefKey";
import { getMdxAst } from "./helpers/getMdxAst";
import { parseCodeMeta } from "./helpers/parseCodeMeta";
import { resolveFileInfo } from "./helpers/resolveFileInfo";
import { resolvePrefixedPath } from "./helpers/resolvePrefixedPath";

export const visitFilePaths = ({
	filePaths,
	uniqueImports,
	demoDataByRef,
	docRoot,
}: {
	filePaths: string[];
	uniqueImports: UniqueImports;
	demoDataByRef: DemoDataByRef;
	/** Resolved doc root (mirrors `config.root`), for the `/`-prefixed `file=` form. */
	docRoot: string;
}) => {
	for (const mdxRoutePath of filePaths) {
		if (!mdxRoutePath.endsWith(".mdx")) continue;

		const mdxAst = getMdxAst(mdxRoutePath);
		const docDirname = path.dirname(mdxRoutePath);

		// Shared by both syntaxes below: resolve an entry file, walk its module
		// graph, and stash the result under the raw reference string so
		// `remarkPlugin`'s separate parse can look it up (see `demoRefKey`).
		const recordDemo = (
			rawRef: string,
			importPath: string,
			dirname: string,
		) => {
			const entryFile = resolveFileInfo({
				importPath,
				dirname,
				importer: mdxRoutePath,
				mdxPath: mdxRoutePath,
			});

			const { files, externalImports } = collectDemoFiles({
				...entryFile,
				mdxPath: mdxRoutePath,
			});

			for (const externalImport of externalImports) {
				uniqueImports.add(externalImport);
			}

			demoDataByRef[demoRefKey(mdxRoutePath, rawRef)] = {
				files,
				entryFileName: entryFile.fileName,
				// Kept per demo as well as folded into the sitewide set above: the
				// set decides what the virtual module can resolve, this list lets
				// the runtime prefetch just this demo's share of it.
				externalImports: [...externalImports],
			};
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

			// See the module docblock: unlike the deprecated `<code src>` below,
			// `file=` can't rely on `resolveFileInfo`'s extension-guessing — core
			// reads this path literally, so guessing here would just move the
			// failure to a later, unrelated ENOENT at MDX-compile time.
			const ext = getFileExt(file);
			if (ext === undefined || !isAllowedExt(ext)) {
				throw new LiveDemoError("FILE_META_EXTENSION_REQUIRED", {
					importPath: file,
					importer: mdxRoutePath,
					mdxPath: mdxRoutePath,
				});
			}

			const { dirname, importPath } = resolvePrefixedPath({
				filePath: file,
				docDirname,
				docRoot,
				importer: mdxRoutePath,
				mdxPath: mdxRoutePath,
			});

			recordDemo(file, importPath, dirname);
		});

		// Deprecated: `<code src="...">` predates the `file=` meta syntax and
		// only ever resolves `./`/`../`-relative to the MDX file, unlike the
		// prefixes above. Removed in a later major.
		visit(mdxAst, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
			if (node.name !== "code") return;

			const src = getNodeAttribute(node, "src");
			if (typeof src !== "string") return;

			recordDemo(src, src, docDirname);
		});
	}
};
