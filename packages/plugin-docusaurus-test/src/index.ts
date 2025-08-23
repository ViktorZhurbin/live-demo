import type { Plugin } from "@docusaurus/types";

export default function pluginDocusaurusTest(): Plugin {
  return {
    name: "@live-demo/plugin-docusaurus-test",
    getClientModules() {
      return [require.resolve("./client.mjs")];
    },
  };
}

export { default as Button } from "./components/Button";
export { default as CodeBlock } from "./components/CodeBlock";
