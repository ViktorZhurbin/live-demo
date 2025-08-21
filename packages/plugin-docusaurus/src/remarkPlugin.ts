import { type LiveDemoPluginOptions, remarkPlugin } from "@live-demo/core";
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
  return remarkPlugin({
    getDemoDataByPath,
    options: pluginOptions.options,
  });
}
