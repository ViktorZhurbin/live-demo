/**
 * Extract attribute value from MDX JSX element
 *
 * Helper for reading attributes from JSX elements in the MDX AST.
 * Example: <code src="./Button.tsx" /> → getMdxJsxAttribute(node, "src") → "./Button.tsx"
 */
import type { MdxJsxFlowElement } from "mdast-util-mdx";

/**
 * Get the value of a JSX attribute from an MDX AST node
 *
 * @param node - MDX JSX element node (e.g., <code> element)
 * @param attrName - Name of the attribute to extract (e.g., "src")
 * @returns Attribute value if found, undefined otherwise
 */
export const getMdxJsxAttribute = (
  node: MdxJsxFlowElement,
  attrName: string,
) => {
  const attribute = node.attributes.find((attr) => {
    return attr.type === "mdxJsxAttribute" && attr.name === attrName;
  });

  return attribute?.value;
};
