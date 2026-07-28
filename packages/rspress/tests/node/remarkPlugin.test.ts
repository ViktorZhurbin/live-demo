import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { Code, Root } from "mdast";
import type { MdxJsxFlowElement, MdxjsEsm } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModuleCache } from "~node/helpers/analyzeModule";
import { getMdxAst } from "~node/helpers/getMdxAst";
import { parseCodeMeta } from "~node/helpers/parseCodeMeta";
import { resolveFileMetaEntry } from "~node/helpers/resolveFileMetaEntry";
import { resetWarnOnce } from "~node/helpers/warnOnce";
import { remarkPlugin } from "~node/remarkPlugin";

const FIXTURES_DIR = path.join(__dirname, "../fixtures");
const mdxPath = (name: string) => path.join(FIXTURES_DIR, "mdx", name);

// Only `docRootPrefixDemo.mdx`/`rootPrefixDemo.mdx` exercise this; every other
// fixture uses `./`/`../`, which never reads it.
const DOC_ROOT = path.join(FIXTURES_DIR, "unused-doc-root");

// The JSX element name both transforms emit; mangled to avoid colliding with
// a page's own bindings (kept in sync with remarkPlugin.ts).
const LIVE_DEMO_NAME = "_LiveDemo";
const LAYOUT_PATH = "/layout/LiveDemo.tsx";

// getMdxAst's return type is the generic mdast `Node`; in practice parsing
// MDX always yields a `Root`.
const parseFixture = (name: string) => getMdxAst(mdxPath(name)) as Root;

/**
 * Simulates @rspress/core's own `remarkFileCodeBlock`, which runs before this
 * plugin in the real pipeline and re-reads a `file=` block's target off disk
 * into `node.value` on every compile. This plugin's own MDX parse
 * (`getMdxAst`, used by `parseFixture` above) never runs that plugin, so
 * without this, `node.value` would stay "" for every `file=` block — not what
 * a real compile looks like.
 */
const populateNodeValues = (
	tree: Root,
	vfilePath: string,
	docRoot: string = DOC_ROOT,
) => {
	const docDirname = path.dirname(vfilePath);

	visit(tree, "code", (node) => {
		const { file, isLive } = parseCodeMeta(node.meta);
		if (!isLive || !file) return;

		const entryFile = resolveFileMetaEntry({
			file,
			docDirname,
			docRoot,
			mdxPath: vfilePath,
		});
		node.value = fs.readFileSync(entryFile.absolutePath, "utf8");
	});
};

type RunPluginProps = Partial<
	Omit<Parameters<typeof remarkPlugin>[0], "layoutPath">
>;

const runPlugin = (
	tree: Root,
	props: RunPluginProps = {},
	vfilePath: string = mdxPath("externalDemo.mdx"),
) => {
	const fullProps = {
		layoutPath: LAYOUT_PATH,
		getDocRoot: () => DOC_ROOT,
		moduleCache: new Map() as ModuleCache,
		...props,
	};

	// remarkPlugin is typed as a unified `Plugin`, which expects to be
	// invoked with a bound `this: Processor`; tests call it as a plain
	// function, so the `this` type is cast away here.
	const attacher = remarkPlugin as unknown as (
		pluginProps: typeof fullProps,
	) => (tree: Root, vfile: { path: string }) => void;
	const transformer = attacher(fullProps);

	// The deprecated `<code src>` branch still warns via `console.warn`
	// (rspress never prints vfile messages) for its deprecation notice.
	const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

	try {
		transformer(tree, { path: vfilePath });
		return { warnings: warn.mock.calls.map(([first]) => String(first)) };
	} finally {
		warn.mockRestore();
	}
};

const findLiveDemoNodes = (tree: Root): MdxJsxFlowElement[] => {
	const nodes: MdxJsxFlowElement[] = [];
	visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
		if (node.name === LIVE_DEMO_NAME) nodes.push(node);
	});
	return nodes;
};

// The layout import remarkPlugin prepends when a page has at least one demo.
const isLayoutImport = (node: Root["children"][number]) =>
	node.type === "mdxjsEsm" &&
	"value" in node &&
	String(node.value).includes(LAYOUT_PATH);

const findLayoutImport = (tree: Root) => tree.children.find(isLayoutImport);

const getAttr = (node: MdxJsxFlowElement, name: string) => {
	const attribute = node.attributes.find(
		(attr) => attr.type === "mdxJsxAttribute" && attr.name === name,
	);
	return attribute &&
		"value" in attribute &&
		typeof attribute.value === "string"
		? JSON.parse(attribute.value)
		: undefined;
};

// The deprecated `<code src>` branch warns once per (page, path) for the
// process's lifetime (see warnOnce.ts) — reset between tests so cases don't
// leak into each other.
afterEach(() => {
	resetWarnOnce();
});

describe("remarkPlugin", () => {
	describe("external `file=` demos", () => {
		it("transforms a `file=` block into <LiveDemo>, reading the entry and its graph off disk", () => {
			const vfilePath = mdxPath("externalDemo.mdx");
			const tree = parseFixture("externalDemo.mdx");
			populateNodeValues(tree, vfilePath);

			runPlugin(tree, {}, vfilePath);

			const [node] = findLiveDemoNodes(tree);
			expect(node).toBeDefined();
			expect(getAttr(node, "entryFileName")).toBe("SimpleComponent.tsx");
			expect(getAttr(node, "files")["SimpleComponent.tsx"]).toContain(
				"Hello World",
			);
		});

		it("throws when a `file=` reference points at a file that doesn't exist", () => {
			// Unlike the earlier two-scan design, this plugin now resolves `file=`
			// itself, so a missing file is caught here rather than only by the
			// build-time scan (see visitFilePaths.test.ts's matching case). A
			// thrown LiveDemoError still surfaces clearly through rspress's MDX
			// pipeline — verified manually against a real `website` build before
			// this refactor; see the task's spike note.
			const vfilePath = mdxPath("missingSrc.mdx");
			const tree = parseFixture("missingSrc.mdx");

			expect(() => runPlugin(tree, {}, vfilePath)).toThrow(
				/Couldn't resolve `\.\/DoesNotExist\.tsx` from `.*missingSrc\.mdx`/,
			);
		});

		it("uses node.value as the entry file's own content, not a fresh disk read", () => {
			// @rspress/core's remarkFileCodeBlock has already put the current
			// on-disk content into node.value by the time this plugin runs.
			// collectDemoFiles still reads the entry from disk itself (it needs
			// the AST to find the entry's own imports), but the *content* stored
			// in `files` for the entry comes from node.value, not that read —
			// this proves it by making the two disagree.
			const tree = parseFixture("externalDemo.mdx");
			visit(tree, "code", (node) => {
				node.value = "export default function SimpleComponent(){ return 2; }";
			});

			runPlugin(tree, {});

			const [node] = findLiveDemoNodes(tree);
			expect(getAttr(node, "files")["SimpleComponent.tsx"]).toContain(
				"return 2;",
			);
		});

		it("leaves a `file=` block alone when its meta is missing the bare `live` word", () => {
			const tree = parseFixture("fileMetaWithoutLive.mdx");

			runPlugin(tree, {}, mdxPath("fileMetaWithoutLive.mdx"));

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});

		it("resolves a `file=` reference using the `<root>/` prefix, against process.cwd()", () => {
			const vfilePath = mdxPath("rootPrefixDemo.mdx");
			const tree = parseFixture("rootPrefixDemo.mdx");
			populateNodeValues(tree, vfilePath);

			runPlugin(tree, {}, vfilePath);

			const [node] = findLiveDemoNodes(tree);
			expect(getAttr(node, "entryFileName")).toBe("SimpleComponent.tsx");
		});

		it("resolves a `file=` reference using the `/` prefix, against getDocRoot()", () => {
			const vfilePath = mdxPath("docRootPrefixDemo.mdx");
			const tree = parseFixture("docRootPrefixDemo.mdx");
			populateNodeValues(tree, vfilePath, FIXTURES_DIR);

			runPlugin(tree, { getDocRoot: () => FIXTURES_DIR }, vfilePath);

			const [node] = findLiveDemoNodes(tree);
			expect(getAttr(node, "entryFileName")).toBe("SimpleComponent.tsx");
		});

		it("merges UI options into the LiveDemo props when provided", () => {
			const vfilePath = mdxPath("externalDemo.mdx");
			const tree = parseFixture("externalDemo.mdx");
			populateNodeValues(tree, vfilePath);
			const options = { controlPanel: { hide: true } };

			runPlugin(tree, { options }, vfilePath);

			const [node] = findLiveDemoNodes(tree);
			expect(getAttr(node, "options")).toEqual(options);
		});

		it("omits the options attribute entirely when none are provided", () => {
			const vfilePath = mdxPath("externalDemo.mdx");
			const tree = parseFixture("externalDemo.mdx");
			populateNodeValues(tree, vfilePath);

			runPlugin(tree, {}, vfilePath);

			const [node] = findLiveDemoNodes(tree);
			const hasOptionsAttr = node.attributes.some(
				(attr) => attr.type === "mdxJsxAttribute" && attr.name === "options",
			);
			expect(hasOptionsAttr).toBe(false);
		});

		it("transforms multiple `file=` demos in the same file independently", () => {
			const vfilePath = mdxPath("multiFileDemo.mdx");
			const tree = parseFixture("multiFileDemo.mdx");
			populateNodeValues(tree, vfilePath);

			runPlugin(tree, {}, vfilePath);

			const nodes = findLiveDemoNodes(tree);
			expect(nodes).toHaveLength(2);
			expect(nodes.map((n) => getAttr(n, "entryFileName")).sort()).toEqual([
				"App.tsx",
				"ComponentWithImports.tsx",
			]);
		});

		it("resolves an identical `file=` string on two different pages to each page's own file", () => {
			const pathA = mdxPath("collidingSrc/a/page.mdx");
			const pathB = mdxPath("collidingSrc/b/page.mdx");
			const treeA = parseFixture("collidingSrc/a/page.mdx");
			const treeB = parseFixture("collidingSrc/b/page.mdx");
			populateNodeValues(treeA, pathA);
			populateNodeValues(treeB, pathB);

			runPlugin(treeA, {}, pathA);
			runPlugin(treeB, {}, pathB);

			const [nodeA] = findLiveDemoNodes(treeA);
			const [nodeB] = findLiveDemoNodes(treeB);

			expect(getAttr(nodeA, "files")["SimpleComponent.tsx"]).toContain(">A<");
			expect(getAttr(nodeB, "files")["SimpleComponent.tsx"]).toContain(">B<");
		});

		it("transforms a `file=` block even without a `lang`, matching the scan half's own lack of a lang check", () => {
			// visitFilePaths.ts never checks `node.lang` for the file= branch
			// (same as @rspress/core's own remarkFileCodeBlock), so this half
			// shouldn't either — only the inline branch, which self-guards on it.
			const tree: Root = {
				type: "root",
				children: [
					{
						type: "code",
						lang: null,
						meta: 'file="../valid/SimpleComponent.tsx" live',
						value: "",
					} as Code,
				],
			};

			runPlugin(tree, {});

			expect(findLiveDemoNodes(tree)).toHaveLength(1);
		});
	});

	describe("deprecated <code src>", () => {
		it("transforms <code src> into <LiveDemo>, same as the file= path", () => {
			const vfilePath = mdxPath("deprecatedSrcDemo.mdx");
			const tree = parseFixture("deprecatedSrcDemo.mdx");

			const { warnings } = runPlugin(tree, {}, vfilePath);

			const [node] = findLiveDemoNodes(tree);
			expect(node).toBeDefined();
			expect(getAttr(node, "entryFileName")).toBe("SimpleComponent.tsx");
			expect(getAttr(node, "files")["SimpleComponent.tsx"]).toContain(
				"Hello World",
			);
			// Deprecation notice only — resolving inline means there's no
			// "missing demo data" state left to also warn about.
			expect(warnings).toHaveLength(1);
			expect(warnings[0]).toContain("deprecated");
		});

		it("resolves a <code src> with no file extension, unlike the `file=` syntax", () => {
			const vfilePath = mdxPath("extensionlessSrc.mdx");
			const tree = parseFixture("extensionlessSrc.mdx");

			runPlugin(tree, {}, vfilePath);

			const [node] = findLiveDemoNodes(tree);
			expect(getAttr(node, "entryFileName")).toBe("SimpleComponent.tsx");
		});

		it("warns about the deprecated syntax only once per (page, path)", () => {
			const vfilePath = mdxPath("deprecatedSrcDemo.mdx");

			// Two separate "recompiles" of the same page, as dev-mode HMR would do.
			const first = runPlugin(
				parseFixture("deprecatedSrcDemo.mdx"),
				{},
				vfilePath,
			);
			const second = runPlugin(
				parseFixture("deprecatedSrcDemo.mdx"),
				{},
				vfilePath,
			);

			expect(first.warnings.some((w) => w.includes("deprecated"))).toBe(true);
			expect(second.warnings.some((w) => w.includes("deprecated"))).toBe(false);
		});
	});

	describe("inline ```lang live code blocks", () => {
		it("transforms an inline live code block into <LiveDemo>", () => {
			const tree = parseFixture("inlineDemo.mdx");

			runPlugin(tree, {});

			const [node] = findLiveDemoNodes(tree);
			expect(node).toBeDefined();
			expect(getAttr(node, "entryFileName")).toBe("App.jsx");
			expect(getAttr(node, "files")["App.jsx"]).toContain("InlineDemo");
		});

		it("ignores code blocks without the 'live' meta flag", () => {
			const tree: Root = {
				type: "root",
				children: [
					{
						type: "code",
						lang: "jsx",
						meta: null,
						value: "const x = 1;",
					} as Code,
				],
			};

			runPlugin(tree, {});

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});

		it("ignores meta strings that merely contain 'live' as a substring", () => {
			const tree: Root = {
				type: "root",
				children: [
					{ type: "code", lang: "jsx", meta: "live-off", value: "x" },
					{ type: "code", lang: "jsx", meta: "alive", value: "x" },
					{ type: "code", lang: "jsx", meta: "livestream", value: "x" },
				] as Code[],
			};

			runPlugin(tree, {});

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});

		it("matches 'live' as one token among others in the meta string", () => {
			const tree: Root = {
				type: "root",
				children: [
					{ type: "code", lang: "jsx", meta: "live title=Foo", value: "x" },
				] as Code[],
			};

			runPlugin(tree, {});

			expect(findLiveDemoNodes(tree)).toHaveLength(1);
		});

		it("ignores live code blocks with an unsupported language", () => {
			const tree: Root = {
				type: "root",
				children: [
					{
						type: "code",
						lang: "python",
						meta: "live",
						value: "x = 1",
					} as Code,
				],
			};

			runPlugin(tree, {});

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});

		it("ignores a live block whose language is an inherited Object property", () => {
			// `node.lang in LiveDemoLanguage` accepts "constructor" via the
			// prototype chain, which would emit a demo with an entry file named
			// `App.constructor` that only fails later, in the browser.
			const tree: Root = {
				type: "root",
				children: [
					{
						type: "code",
						lang: "constructor",
						meta: "live",
						value: "const x = 1;",
					} as Code,
				],
			};

			runPlugin(tree, {});

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});

		it("ignores code blocks with no language at all", () => {
			const tree: Root = {
				type: "root",
				children: [
					{
						type: "code",
						lang: null,
						meta: "live",
						value: "plain text",
					} as Code,
				],
			};

			expect(() => runPlugin(tree, {})).not.toThrow();
			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});
	});

	describe("per-page layout import", () => {
		it("prepends the layout import as the first child when a demo is present", () => {
			const vfilePath = mdxPath("externalDemo.mdx");
			const tree = parseFixture("externalDemo.mdx");
			populateNodeValues(tree, vfilePath);

			runPlugin(tree, {}, vfilePath);

			const importNode = findLayoutImport(tree);
			// First child so the binding is in scope for the demo nodes below it.
			expect(tree.children[0]).toBe(importNode);
			expect(importNode?.type).toBe("mdxjsEsm");
			const esmNode = importNode as MdxjsEsm;
			expect(esmNode.value).toContain(LIVE_DEMO_NAME);
			// `data.estree` is what the MDX compiler serializes the import from.
			expect(esmNode.data?.estree).toBeDefined();
		});

		it("injects exactly one import even with multiple demos on the page", () => {
			const vfilePath = mdxPath("multiFileDemo.mdx");
			const tree = parseFixture("multiFileDemo.mdx");
			populateNodeValues(tree, vfilePath);

			runPlugin(tree, {}, vfilePath);

			expect(tree.children.filter(isLayoutImport)).toHaveLength(1);
		});

		it("does not inject the import when no demo is transformed", () => {
			const tree: Root = {
				type: "root",
				children: [
					{ type: "code", lang: "jsx", meta: null, value: "x" } as Code,
				],
			};

			runPlugin(tree, {});

			expect(findLayoutImport(tree)).toBeUndefined();
		});
	});

	/**
	 * The bug this refactor fixes: `remarkPlugin` no longer just reads back
	 * what a once-per-process scan recorded, so an edit to a file the entry
	 * merely *imports* has to show up on the very next compile with no
	 * rescan — and `analyzeModule`'s per-file mtime cache has to be what keeps
	 * that from re-reading the untouched entry a second time too.
	 */
	describe("dev-mode freshness of an imported (non-entry) file", () => {
		it("picks up an on-disk edit to an imported file across two compiles sharing one moduleCache, without re-reading the unchanged entry", () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), "remarkPlugin-"));
			const vfilePath = path.join(dir, "page.mdx");
			const entryPath = path.join(dir, "App.tsx");
			const importedPath = path.join(dir, "Button.tsx");

			fs.writeFileSync(
				entryPath,
				'import { Button } from "./Button";\nexport default function App() { return Button(); }\n',
			);
			fs.writeFileSync(importedPath, 'export const Button = () => "v1";\n');

			const moduleCache: ModuleCache = new Map();
			const buildTree = (): Root => ({
				type: "root",
				children: [
					{
						type: "code",
						lang: "tsx",
						meta: 'file="./App.tsx" live',
						value: fs.readFileSync(entryPath, "utf8"),
					} as Code,
				],
			});

			try {
				const firstTree = buildTree();
				runPlugin(firstTree, { moduleCache }, vfilePath);
				const [firstNode] = findLiveDemoNodes(firstTree);
				expect(getAttr(firstNode, "files")["Button.tsx"]).toContain("v1");

				fs.writeFileSync(importedPath, 'export const Button = () => "v2";\n');
				// Guarantee a strictly later mtime than whatever got cached above
				// — see analyzeModule.test.ts's identical note on why this can't
				// just rely on two back-to-back writes.
				const future = new Date(Date.now() + 10_000);
				fs.utimesSync(importedPath, future, future);

				// Spying starts before `buildTree()`, which itself does one
				// `readFileSync` on the entry to populate `node.value` — modeling
				// core's own re-read, not `collectDemoFiles`'s. The assertion below
				// is that this is the *only* entry read: `collectDemoFiles` must
				// not add a second one just because it re-parses the entry for its
				// own dependency list.
				const readFileSync = vi.spyOn(fs, "readFileSync");
				try {
					const secondTree = buildTree();
					runPlugin(secondTree, { moduleCache }, vfilePath);

					const [secondNode] = findLiveDemoNodes(secondTree);
					expect(getAttr(secondNode, "files")["Button.tsx"]).toContain("v2");

					// The entry's own mtime never changed, so its cached parse
					// should be served straight from `moduleCache` rather than
					// read from disk a second time.
					const entryReads = readFileSync.mock.calls.filter(([target]) =>
						String(target).endsWith("App.tsx"),
					);
					expect(entryReads).toHaveLength(1);
				} finally {
					readFileSync.mockRestore();
				}
			} finally {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});
	});
});
