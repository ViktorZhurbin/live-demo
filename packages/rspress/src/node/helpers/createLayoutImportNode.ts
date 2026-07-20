import type { MdxjsEsm } from "mdast-util-mdx";

/**
 * Builds the `import <localName> from "<layoutPath>"` node that `remarkPlugin`
 * prepends to every page that contains at least one demo. Registering the
 * layout per-page (instead of as a global component) keeps the demo runtime —
 * CodeMirror, the virtual-modules bundle, every collected external — out of
 * pages that have no demos.
 *
 * The MDX compiler serializes ESM from `data.estree`, so `value` alone isn't
 * enough — both are set. `localName` is the JSX element name the transforms
 * emit; it's mangled to avoid colliding with the page's own bindings.
 */
export const createLayoutImportNode = (
	layoutPath: string,
	localName: string,
): MdxjsEsm => {
	return {
		type: "mdxjsEsm",
		value: `import ${localName} from ${JSON.stringify(layoutPath)}`,
		data: {
			estree: {
				type: "Program",
				sourceType: "module",
				body: [
					{
						type: "ImportDeclaration",
						specifiers: [
							{
								type: "ImportDefaultSpecifier",
								local: { type: "Identifier", name: localName },
							},
						],
						source: {
							type: "Literal",
							value: layoutPath,
							raw: JSON.stringify(layoutPath),
						},
						attributes: [],
					},
				],
			},
		},
	};
};
