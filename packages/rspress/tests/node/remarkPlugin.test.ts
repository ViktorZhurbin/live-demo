import path from "node:path";

import type { Code, Root } from "mdast";
import type { MdxJsxFlowElement, MdxjsEsm } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoRefKey } from "~node/helpers/demoRefKey";
import { getMdxAst } from "~node/helpers/getMdxAst";
import { resetWarnOnce } from "~node/helpers/warnOnce";
import { remarkPlugin } from "~node/remarkPlugin";
import type { DemoDataByRef } from "~shared/types";

const FIXTURES_DIR = path.join(__dirname, "../fixtures");
const mdxPath = (name: string) => path.join(FIXTURES_DIR, "mdx", name);

// Demos are keyed by the raw reference (the `file=` path, or the deprecated
// `<code src>`'s `src`) plus the MDX page (see `demoRefKey`). Tests seed
// `demoDataByRef` with the same key the plugin will look up (i.e., the
// `vfilePath` they run under).
const refKey = (mdxName: string, src: string) =>
	demoRefKey(mdxPath(mdxName), src);

// The JSX element name both transforms emit; mangled to avoid colliding with
// a page's own bindings (kept in sync with remarkPlugin.ts).
const LIVE_DEMO_NAME = "_LiveDemo";
const LAYOUT_PATH = "/layout/LiveDemo.tsx";

// getMdxAst's return type is the generic mdast `Node`; in practice parsing
// MDX always yields a `Root`.
const parseFixture = (name: string) => getMdxAst(mdxPath(name)) as Root;

/**
 * `vfilePath` stands in for the MDX file's own path. The plugin keys demo data
 * by it (plus each reference string). Tests exercising an external demo must
 * pass the same fixture path used by `parseFixture` and seed `demoDataByRef`
 * under `refKey(thatFixture, ref)`.
 */
const runPlugin = (
	tree: Root,
	props: Omit<Parameters<typeof remarkPlugin>[0], "layoutPath">,
	vfilePath: string = mdxPath("externalDemo.mdx"),
) => {
	const fullProps = { layoutPath: LAYOUT_PATH, ...props };

	// remarkPlugin is typed as a unified `Plugin`, which expects to be
	// invoked with a bound `this: Processor`; tests call it as a plain
	// function, so the `this` type is cast away here.
	const attacher = remarkPlugin as unknown as (
		pluginProps: typeof fullProps,
	) => (tree: Root, vfile: { path: string }) => void;
	const transformer = attacher(fullProps);

	// The plugin warns via `console.warn` (rspress never prints vfile
	// messages). Spying is the only way to observe it.
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
		it("transforms a `file=` block into <LiveDemo> using matching demo data", () => {
			const tree = parseFixture("externalDemo.mdx");
			const demoDataByRef: DemoDataByRef = {
				[refKey("externalDemo.mdx", "../valid/SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: {
						"SimpleComponent.tsx":
							"export default function SimpleComponent(){}",
					},
				},
			};

			runPlugin(tree, { demoDataByRef });

			const [node] = findLiveDemoNodes(tree);
			expect(node).toBeDefined();
			expect(getAttr(node, "entryFileName")).toBe("SimpleComponent.tsx");
			expect(getAttr(node, "files")).toEqual({
				"SimpleComponent.tsx": "export default function SimpleComponent(){}",
			});
		});

		it("leaves the block untouched but warns when no demo data matches its reference", () => {
			const tree = parseFixture("externalDemo.mdx");

			const { warnings } = runPlugin(tree, { demoDataByRef: {} });

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
			expect(warnings).toHaveLength(1);
			expect(warnings[0]).toContain("No demo data for");

			let codeNodeStillPresent = false;
			visit(tree, "code", (node) => {
				if (node.lang === "tsx") codeNodeStillPresent = true;
			});
			expect(codeNodeStillPresent).toBe(true);
		});

		it("warns rather than throws for a `file=` reference to a missing file (resolution now lives only in the scan phase)", () => {
			// remarkPlugin never resolves file= against disk. A genuinely missing
			// file is caught earlier by `visitFilePaths` (see its test). Here,
			// with nothing recorded for this reference, the node is left alone
			// and a warning fires (the same path as any other unmatched reference).
			const tree = parseFixture("missingSrc.mdx");

			const { warnings } = runPlugin(
				tree,
				{ demoDataByRef: {} },
				mdxPath("missingSrc.mdx"),
			);

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
			expect(warnings).toHaveLength(1);
			expect(warnings[0]).toContain("No demo data for");
		});

		it("overrides the entry file's content with node.value when core has already substituted it", () => {
			// Simulates @rspress/core's own remarkFileCodeBlock, which runs before
			// this plugin and replaces `node.value` with the file's current
			// contents on every dev-mode recompile — fixing staleness between
			// `demoDataByRef` (populated once by routeGenerated) and an edit made
			// to the entry file itself since.
			const tree = parseFixture("externalDemo.mdx");
			visit(tree, "code", (node) => {
				node.value = "export default function SimpleComponent(){ return 2; }";
			});

			const demoDataByRef: DemoDataByRef = {
				[refKey("externalDemo.mdx", "../valid/SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: {
						"SimpleComponent.tsx":
							"export default function SimpleComponent(){ return 1; }",
					},
				},
			};

			runPlugin(tree, { demoDataByRef });

			const [node] = findLiveDemoNodes(tree);
			expect(getAttr(node, "files")["SimpleComponent.tsx"]).toContain(
				"return 2;",
			);
		});

		it("keeps the scan's own content when node.value is empty (this plugin's own MDX parse never ran core's remarkFileCodeBlock)", () => {
			const tree = parseFixture("externalDemo.mdx");

			const demoDataByRef: DemoDataByRef = {
				[refKey("externalDemo.mdx", "../valid/SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "from the scan" },
				},
			};

			runPlugin(tree, { demoDataByRef });

			const [node] = findLiveDemoNodes(tree);
			expect(getAttr(node, "files")["SimpleComponent.tsx"]).toBe(
				"from the scan",
			);
		});

		it("leaves a `file=` block alone when its meta is missing the bare `live` word", () => {
			const tree = parseFixture("fileMetaWithoutLive.mdx");

			runPlugin(tree, {
				demoDataByRef: {
					[refKey("fileMetaWithoutLive.mdx", "../valid/SimpleComponent.tsx")]: {
						entryFileName: "SimpleComponent.tsx",
						files: { "SimpleComponent.tsx": "..." },
					},
				},
			});

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});

		it("merges UI options into the LiveDemo props when provided", () => {
			const tree = parseFixture("externalDemo.mdx");
			const demoDataByRef: DemoDataByRef = {
				[refKey("externalDemo.mdx", "../valid/SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "..." },
				},
			};
			const options = { controlPanel: { hide: true } };

			runPlugin(tree, { options, demoDataByRef });

			const [node] = findLiveDemoNodes(tree);
			expect(getAttr(node, "options")).toEqual(options);
		});

		it("omits the options attribute entirely when none are provided", () => {
			const tree = parseFixture("externalDemo.mdx");
			const demoDataByRef: DemoDataByRef = {
				[refKey("externalDemo.mdx", "../valid/SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "..." },
				},
			};

			runPlugin(tree, { demoDataByRef });

			const [node] = findLiveDemoNodes(tree);
			const hasOptionsAttr = node.attributes.some(
				(attr) => attr.type === "mdxJsxAttribute" && attr.name === "options",
			);
			expect(hasOptionsAttr).toBe(false);
		});

		it("transforms multiple `file=` demos in the same file independently", () => {
			const tree = parseFixture("multiFileDemo.mdx");
			const demoDataByRef: DemoDataByRef = {
				[refKey("multiFileDemo.mdx", "../valid/MultiFile/App.tsx")]: {
					entryFileName: "App.tsx",
					files: { "App.tsx": "...", "Button.tsx": "..." },
				},
				[refKey("multiFileDemo.mdx", "../valid/ComponentWithImports.tsx")]: {
					entryFileName: "ComponentWithImports.tsx",
					files: { "ComponentWithImports.tsx": "..." },
				},
			};

			runPlugin(tree, { demoDataByRef }, mdxPath("multiFileDemo.mdx"));

			const nodes = findLiveDemoNodes(tree);
			expect(nodes).toHaveLength(2);
			expect(nodes.map((n) => getAttr(n, "entryFileName")).sort()).toEqual([
				"App.tsx",
				"ComponentWithImports.tsx",
			]);
		});

		it("keys an identical reference string by its own page, so two pages don't collide", () => {
			const treeA = parseFixture("collidingSrc/a/page.mdx");
			const treeB = parseFixture("collidingSrc/b/page.mdx");

			const demoDataByRef: DemoDataByRef = {
				[refKey("collidingSrc/a/page.mdx", "./SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "A" },
				},
				[refKey("collidingSrc/b/page.mdx", "./SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "B" },
				},
			};

			runPlugin(treeA, { demoDataByRef }, mdxPath("collidingSrc/a/page.mdx"));
			runPlugin(treeB, { demoDataByRef }, mdxPath("collidingSrc/b/page.mdx"));

			const [nodeA] = findLiveDemoNodes(treeA);
			const [nodeB] = findLiveDemoNodes(treeB);

			expect(getAttr(nodeA, "files")).toEqual({ "SimpleComponent.tsx": "A" });
			expect(getAttr(nodeB, "files")).toEqual({ "SimpleComponent.tsx": "B" });
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
			const demoDataByRef: DemoDataByRef = {
				[refKey("externalDemo.mdx", "../valid/SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "..." },
				},
			};

			runPlugin(tree, { demoDataByRef });

			expect(findLiveDemoNodes(tree)).toHaveLength(1);
		});
	});

	describe("deprecated <code src>", () => {
		it("transforms <code src> into <LiveDemo>, same as the file= path", () => {
			const tree = parseFixture("deprecatedSrcDemo.mdx");
			const demoDataByRef: DemoDataByRef = {
				[refKey("deprecatedSrcDemo.mdx", "../valid/SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "export default function () {}" },
				},
			};

			const { warnings } = runPlugin(
				tree,
				{ demoDataByRef },
				mdxPath("deprecatedSrcDemo.mdx"),
			);

			const [node] = findLiveDemoNodes(tree);
			expect(node).toBeDefined();
			expect(getAttr(node, "entryFileName")).toBe("SimpleComponent.tsx");
			// Deprecation notice, not the "no demo data" warning.
			expect(warnings).toHaveLength(1);
			expect(warnings[0]).toContain("deprecated");
		});

		it("warns about missing demo data in addition to the deprecation notice", () => {
			const tree = parseFixture("deprecatedSrcDemo.mdx");

			const { warnings } = runPlugin(
				tree,
				{ demoDataByRef: {} },
				mdxPath("deprecatedSrcDemo.mdx"),
			);

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
			expect(warnings).toHaveLength(2);
			expect(warnings.some((w) => w.includes("deprecated"))).toBe(true);
			expect(warnings.some((w) => w.includes("No demo data for"))).toBe(true);
		});

		it("warns about the deprecated syntax only once per (page, path)", () => {
			const demoDataByRef: DemoDataByRef = {
				[refKey("deprecatedSrcDemo.mdx", "../valid/SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "..." },
				},
			};

			// Two separate "recompiles" of the same page, as dev-mode HMR would do.
			const first = runPlugin(
				parseFixture("deprecatedSrcDemo.mdx"),
				{ demoDataByRef },
				mdxPath("deprecatedSrcDemo.mdx"),
			);
			const second = runPlugin(
				parseFixture("deprecatedSrcDemo.mdx"),
				{ demoDataByRef },
				mdxPath("deprecatedSrcDemo.mdx"),
			);

			expect(first.warnings.some((w) => w.includes("deprecated"))).toBe(true);
			expect(second.warnings.some((w) => w.includes("deprecated"))).toBe(false);
		});
	});

	describe("inline ```lang live code blocks", () => {
		it("transforms an inline live code block into <LiveDemo>", () => {
			const tree = parseFixture("inlineDemo.mdx");

			runPlugin(tree, { demoDataByRef: {} });

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

			runPlugin(tree, { demoDataByRef: {} });

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

			runPlugin(tree, { demoDataByRef: {} });

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});

		it("matches 'live' as one token among others in the meta string", () => {
			const tree: Root = {
				type: "root",
				children: [
					{ type: "code", lang: "jsx", meta: "live title=Foo", value: "x" },
				] as Code[],
			};

			runPlugin(tree, { demoDataByRef: {} });

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

			runPlugin(tree, { demoDataByRef: {} });

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

			runPlugin(tree, { demoDataByRef: {} });

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

			expect(() => runPlugin(tree, { demoDataByRef: {} })).not.toThrow();
			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});
	});

	describe("per-page layout import", () => {
		const demoDataByRef: DemoDataByRef = {
			[refKey("externalDemo.mdx", "../valid/SimpleComponent.tsx")]: {
				entryFileName: "SimpleComponent.tsx",
				files: { "SimpleComponent.tsx": "..." },
			},
		};

		it("prepends the layout import as the first child when a demo is present", () => {
			const tree = parseFixture("externalDemo.mdx");

			runPlugin(tree, { demoDataByRef });

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
			const tree = parseFixture("multiFileDemo.mdx");

			runPlugin(
				tree,
				{
					demoDataByRef: {
						[refKey("multiFileDemo.mdx", "../valid/MultiFile/App.tsx")]: {
							entryFileName: "App.tsx",
							files: { "App.tsx": "...", "Button.tsx": "..." },
						},
						[refKey("multiFileDemo.mdx", "../valid/ComponentWithImports.tsx")]:
							{
								entryFileName: "ComponentWithImports.tsx",
								files: { "ComponentWithImports.tsx": "..." },
							},
					},
				},
				mdxPath("multiFileDemo.mdx"),
			);

			expect(tree.children.filter(isLayoutImport)).toHaveLength(1);
		});

		it("does not inject the import when no demo is transformed", () => {
			const tree: Root = {
				type: "root",
				children: [
					{ type: "code", lang: "jsx", meta: null, value: "x" } as Code,
				],
			};

			runPlugin(tree, { demoDataByRef: {} });

			expect(findLayoutImport(tree)).toBeUndefined();
		});
	});
});
