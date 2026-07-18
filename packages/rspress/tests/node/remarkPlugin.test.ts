import path from "node:path";

import type { Root } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx";
import { getMdxAst } from "node/helpers/getMdxAst";
import { remarkPlugin } from "node/remarkPlugin";
import type { DemoDataByPath } from "shared/types";
import { visit } from "unist-util-visit";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(__dirname, "../fixtures");
const mdxPath = (name: string) => path.join(FIXTURES_DIR, "mdx", name);

// getMdxAst's return type is the generic mdast `Node`; in practice parsing
// MDX always yields a `Root`.
const parseFixture = (name: string) => getMdxAst(mdxPath(name)) as Root;

const runPlugin = (tree: Root, props: Parameters<typeof remarkPlugin>[0]) => {
	// remarkPlugin is typed as a unified `Plugin`, which expects to be
	// invoked with a bound `this: Processor`; tests call it as a plain
	// function, so the `this` type is cast away here.
	const attacher = remarkPlugin as unknown as (
		pluginProps: typeof props,
	) => (tree: Root) => void;
	const transformer = attacher(props);
	transformer(tree);
};

const findLiveDemoNodes = (tree: Root): MdxJsxFlowElement[] => {
	const nodes: MdxJsxFlowElement[] = [];
	visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
		if (node.name === "LiveDemo") nodes.push(node);
	});
	return nodes;
};

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
				"../valid/SimpleComponent.tsx": {
					entryFileName: "SimpleComponent.tsx",
					files: {
						"SimpleComponent.tsx":
							"export default function SimpleComponent(){}",
					},
				},
			};

			runPlugin(tree, { getDemoDataByPath: () => demoDataByPath });

			const [node] = findLiveDemoNodes(tree);
			expect(node).toBeDefined();
			expect(getAttr(node, "entryFileName")).toBe("SimpleComponent.tsx");
			expect(getAttr(node, "files")).toEqual({
				"SimpleComponent.tsx": "export default function SimpleComponent(){}",
			});
		});

		it("leaves <code src> untouched when no demo data matches the path", () => {
			const tree = parseFixture("externalDemo.mdx");

			runPlugin(tree, { getDemoDataByPath: () => ({}) });

			expect(findLiveDemoNodes(tree)).toHaveLength(0);

			let codeNodeStillPresent = false;
			visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
				if (node.name === "code") codeNodeStillPresent = true;
			});
			expect(codeNodeStillPresent).toBe(true);
		});

		it("merges UI options into the LiveDemo props when provided", () => {
			const tree = parseFixture("externalDemo.mdx");
			const demoDataByPath: DemoDataByPath = {
				"../valid/SimpleComponent.tsx": {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "..." },
				},
			};
			const options = { controlPanel: { hide: true } };

			runPlugin(tree, { options, getDemoDataByPath: () => demoDataByPath });

			const [node] = findLiveDemoNodes(tree);
			expect(getAttr(node, "options")).toEqual(options);
		});

		it("omits the options attribute entirely when none are provided", () => {
			const tree = parseFixture("externalDemo.mdx");
			const demoDataByPath: DemoDataByPath = {
				"../valid/SimpleComponent.tsx": {
					entryFileName: "SimpleComponent.tsx",
					files: { "SimpleComponent.tsx": "..." },
				},
			};

			runPlugin(tree, { getDemoDataByPath: () => demoDataByPath });

			const [node] = findLiveDemoNodes(tree);
			const hasOptionsAttr = node.attributes.some(
				(attr) => attr.type === "mdxJsxAttribute" && attr.name === "options",
			);
			expect(hasOptionsAttr).toBe(false);
		});

		it("transforms multiple <code src> demos in the same file independently", () => {
			const tree = parseFixture("multiFileDemo.mdx");
			const demoDataByPath: DemoDataByPath = {
				"../valid/MultiFile/App.tsx": {
					entryFileName: "App.tsx",
					files: { "App.tsx": "...", "Button.tsx": "..." },
				},
				"../valid/ComponentWithImports.tsx": {
					entryFileName: "ComponentWithImports.tsx",
					files: { "ComponentWithImports.tsx": "..." },
				},
			};

			runPlugin(tree, { getDemoDataByPath: () => demoDataByPath });

			const nodes = findLiveDemoNodes(tree);
			expect(nodes).toHaveLength(2);
			expect(nodes.map((n) => getAttr(n, "entryFileName")).sort()).toEqual([
				"App.tsx",
				"ComponentWithImports.tsx",
			]);
		});
	});

	describe("inline ```lang live code blocks", () => {
		it("transforms an inline live code block into <LiveDemo>", () => {
			const tree = parseFixture("inlineDemo.mdx");

			runPlugin(tree, { getDemoDataByPath: () => ({}) });

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

			runPlugin(tree, { getDemoDataByPath: () => ({}) });

			expect(findLiveDemoNodes(tree)).toHaveLength(0);
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

			runPlugin(tree, { getDemoDataByPath: () => ({}) });

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

			expect(() =>
				runPlugin(tree, { getDemoDataByPath: () => ({}) }),
			).not.toThrow();
			expect(findLiveDemoNodes(tree)).toHaveLength(0);
		});
	});
});
