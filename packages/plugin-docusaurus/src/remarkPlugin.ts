import type { LiveDemoPluginOptions } from "@live-demo/core";
import type { Root } from "mdast";
import type { Plugin } from "unified";
import { getDemoDataByPath } from "./shared";

interface DocusaurusRemarkPluginOptions {
  options?: LiveDemoPluginOptions["ui"];
}

/**
 * Wrapper around the core remark plugin that uses shared demo data
 */
export function createDocusaurusRemarkPlugin(
  pluginOptions: DocusaurusRemarkPluginOptions = {},
): Plugin<[], Root> {
  return async (tree, vfile) => {
    // Dynamically import the remark plugin to avoid loading MDX dependencies at config time
    const { remarkPlugin } = await import("@live-demo/core");

    const processor = remarkPlugin({
      getDemoDataByPath,
      options: pluginOptions.options,
    });

    return processor(tree, vfile);
  };
}
