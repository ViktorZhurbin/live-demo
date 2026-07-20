import path from "node:path";

import type { Root } from "mdast";
import type { MdxJsxFlowElement, MdxjsEsm } from "mdast-util-mdx";
import { visit } from "unist-util-visit";
import { describe, expect, it, vi } from "vitest";
import { getMdxAst } from "~node/helpers/getMdxAst";
import { remarkPlugin } from "~node/remarkPlugin";
import type { DemoDataByPath } from "~shared/types";

const FIXTURES_DIR = path.join(__dirname, "../fixtures");
const mdxPath = (name: string) => path.join(FIXTURES_DIR, "mdx", name);
const validPath = (name: string) => path.join(FIXTURES_DIR, "valid", name);

// The JSX element name both transforms emit; mangled to avoid colliding with
// a page's own bindings (kept in sync with remarkPlugin.ts).
const LIVE_DEMO_NAME = "_LiveDemo";
const LAYOUT_PATH = "/layout/LiveDemo.tsx";

// getMdxAst's return type is the generic mdast `Node`; in practice parsing
// MDX always yields a `Root`.
const parseFixture = (name: string) => getMdxAst(mdxPath(name)) as Root;

/**
 * `vfilePath` stands in for the MDX file's own path, which the plugin uses
 * to resolve `<code src>`. Tests exercising `<code src>` must pass the same
 * fixture path used by `parseFixture` so resolution lands on the same file.
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

	// The plugin warns via `console.warn` — rspress never prints vfile
	// messages. Spying is the only way to observe it.
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

describe("remarkPlugin", () => {
	describe("external <code src> demos", () => {
		it("transforms <code src> into <LiveDemo> using matching demo data", () => {
			const tree = parseFixture("externalDemo.mdx");
			const demoDataByPath: DemoDataByPath = {
				[validPath("SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: {
						"SimpleComponent.tsx":
							"export default function SimpleComponent(){}",
					},
				},
			};

			runPlugin(tree, { demoDataByPath });

			const [node] = findLiveDemoNodes(tree);
			expect(node).toBeDefined();
			expect(getAttr(node, "entryFileName")).toBe("SimpleComponent.tsx");
			expect(getAttr(node, "files")).toEqual({
				"SimpleComponent.tsx": "export default function SimpleComponent(){}",
			});
		});

		it("leaves <code src> untouched but warns when no demo data matches the path", () => {
			const tree = parseFixture("externalDemo.mdx");

			const { warnings } = runPlugin(tree, { demoDataByPath: {} });

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
			expect(warnings).toHaveLength(1);
			expect(warnings[0]).toContain("No demo data for");

			let codeNodeStillPresent = false;
			visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
				if (node.name === "code") codeNodeStillPresent = true;
			});
			expect(codeNodeStillPresent).toBe(true);
		});

		it("throws, naming the MDX page, when the <code src> itself can't be resolved", () => {
			// Unlike the no-demo-data case above (src resolves, scan missed it),
			// here the src path doesn't exist at all — that's a build error, and
			// the MDX page is the importer.
			const tree = parseFixture("missingSrc.mdx");

			expect(() =>
				runPlugin(tree, { demoDataByPath: {} }, mdxPath("missingSrc.mdx")),
			).toThrow(
				/Couldn't resolve `\.\/DoesNotExist\.tsx` from `.*missingSrc\.mdx`/,
			);
		});

		it("merges UI options into the LiveDemo props when provided", () => {
			const tree = parseFixture("externalDemo.mdx");
			const demoDataByPath: DemoDataByPath = {
				[validPath("SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "..." },
				},
			};
			const options = { controlPanel: { hide: true } };

			runPlugin(tree, { options, demoDataByPath });

			const [node] = findLiveDemoNodes(tree);
			expect(getAttr(node, "options")).toEqual(options);
		});

		it("omits the options attribute entirely when none are provided", () => {
			const tree = parseFixture("externalDemo.mdx");
			const demoDataByPath: DemoDataByPath = {
				[validPath("SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "..." },
				},
			};

			runPlugin(tree, { demoDataByPath });

			const [node] = findLiveDemoNodes(tree);
			const hasOptionsAttr = node.attributes.some(
				(attr) => attr.type === "mdxJsxAttribute" && attr.name === "options",
			);
			expect(hasOptionsAttr).toBe(false);
		});

		it("transforms multiple <code src> demos in the same file independently", () => {
			const tree = parseFixture("multiFileDemo.mdx");
			const demoDataByPath: DemoDataByPath = {
				[validPath("MultiFile/App.tsx")]: {
					entryFileName: "App.tsx",
					files: { "App.tsx": "...", "Button.tsx": "..." },
				},
				[validPath("ComponentWithImports.tsx")]: {
					entryFileName: "ComponentWithImports.tsx",
					files: { "ComponentWithImports.tsx": "..." },
				},
			};

			runPlugin(tree, { demoDataByPath }, mdxPath("multiFileDemo.mdx"));

			const nodes = findLiveDemoNodes(tree);
			expect(nodes).toHaveLength(2);
			expect(nodes.map((n) => getAttr(n, "entryFileName")).sort()).toEqual([
				"App.tsx",
				"ComponentWithImports.tsx",
			]);
		});

		it("resolves an identical <code src> string against each page's own directory, not a colliding key", () => {
			const treeA = parseFixture("collidingSrc/a/page.mdx");
			const treeB = parseFixture("collidingSrc/b/page.mdx");

			const demoDataByPath: DemoDataByPath = {
				[mdxPath("collidingSrc/a/SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "A" },
				},
				[mdxPath("collidingSrc/b/SimpleComponent.tsx")]: {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "B" },
				},
			};

			runPlugin(treeA, { demoDataByPath }, mdxPath("collidingSrc/a/page.mdx"));
			runPlugin(treeB, { demoDataByPath }, mdxPath("collidingSrc/b/page.mdx"));

			const [nodeA] = findLiveDemoNodes(treeA);
			const [nodeB] = findLiveDemoNodes(treeB);

			expect(getAttr(nodeA, "files")).toEqual({ "SimpleComponent.tsx": "A" });
			expect(getAttr(nodeB, "files")).toEqual({ "SimpleComponent.tsx": "B" });
		});
	});

	describe("inline ```lang live code blocks", () => {
		it("transforms an inline live code block into <LiveDemo>", () => {
			const tree = parseFixture("inlineDemo.mdx");

			runPlugin(tree, { demoDataByPath: {} });

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
					} as never,
				],
			};

			runPlugin(tree, { demoDataByPath: {} });

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});

		it("ignores meta strings that merely contain 'live' as a substring", () => {
			const tree: Root = {
				type: "root",
				children: [
					{ type: "code", lang: "jsx", meta: "live-off", value: "x" },
					{ type: "code", lang: "jsx", meta: "alive", value: "x" },
					{ type: "code", lang: "jsx", meta: "livestream", value: "x" },
				] as never,
			};

			runPlugin(tree, { demoDataByPath: {} });

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});

		it("matches 'live' as one token among others in the meta string", () => {
			const tree: Root = {
				type: "root",
				children: [
					{ type: "code", lang: "jsx", meta: "live title=Foo", value: "x" },
				] as never,
			};

			runPlugin(tree, { demoDataByPath: {} });

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
					} as never,
				],
			};

			runPlugin(tree, { demoDataByPath: {} });

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
					} as never,
				],
			};

			runPlugin(tree, { demoDataByPath: {} });

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
					} as never,
				],
			};

			expect(() => runPlugin(tree, { demoDataByPath: {} })).not.toThrow();
			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});
	});

	describe("per-page layout import", () => {
		const demoDataByPath: DemoDataByPath = {
			[validPath("SimpleComponent.tsx")]: {
				entryFileName: "SimpleComponent.tsx",
				files: { "SimpleComponent.tsx": "..." },
			},
		};

		it("prepends the layout import as the first child when a demo is present", () => {
			const tree = parseFixture("externalDemo.mdx");

			runPlugin(tree, { demoDataByPath });

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
					demoDataByPath: {
						[validPath("MultiFile/App.tsx")]: {
							entryFileName: "App.tsx",
							files: { "App.tsx": "...", "Button.tsx": "..." },
						},
						[validPath("ComponentWithImports.tsx")]: {
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
					{ type: "code", lang: "jsx", meta: null, value: "x" } as never,
				],
			};

			runPlugin(tree, { demoDataByPath: {} });

			expect(findLayoutImport(tree)).toBeUndefined();
		});
	});
});
