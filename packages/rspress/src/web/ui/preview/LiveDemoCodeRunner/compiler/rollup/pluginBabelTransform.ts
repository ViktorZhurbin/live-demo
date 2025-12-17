import type { Plugin } from "@rollup/browser";
import { babelTransformCode } from "../babel/babelTransformCode";

/**
 * Rollup requires plugins to handle JSX/TSX,
 * but they depend on node and don't work in the browser.
 * Using @babel/standalone to transform JSX/TSX into JS
 * */
export const pluginBabelTransform = (): Plugin => {
  return {
    name: "babel-transform",
    transform(code, filename) {
      const transformedCode = babelTransformCode(code, filename);

      return {
        code: transformedCode,
        map: null,
      };
    },
  };
};
