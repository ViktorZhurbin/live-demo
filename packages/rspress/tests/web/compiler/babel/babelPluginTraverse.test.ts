import Babel from "@babel/standalone";
import { describe, expect, it } from "vitest";
import { babelPluginTraverse } from "web/ui/preview/LiveDemoCodeRunner/compiler/babel/babelPluginTraverse";

/**
 * Runs the plugin through real Babel (not a mock) so we assert on the
 * actual generated code, the same way pluginBabelTransformImportsExports
 * uses it in the rollup renderChunk hook.
 */
const transform = (code: string) => {
  const result = Babel.transform(code, {
    sourceType: "module",
    plugins: [babelPluginTraverse()],
  });

  return result?.code ?? "";
};

describe("babelPluginTraverse", () => {
  describe("default and namespace imports", () => {
    it("rewrites a default import to __get_import with getDefault=true", () => {
      const output = transform(`import React from 'react';`);

      expect(output).toMatch(/const React = __get_import\('react', true\)/);
    });

    it("rewrites a namespace import to __get_import with getDefault=false", () => {
      const output = transform(`import * as ReactDOM from 'react-dom';`);

      expect(output).toMatch(
        /const ReactDOM = __get_import\('react-dom', false\)/,
      );
    });
  });

  describe("named imports", () => {
    it("rewrites named imports to a destructure from __get_import", () => {
      const output = transform(`import { useState } from 'react';`);

      expect(output).toMatch(
        /const\s*\{\s*useState\s*\}\s*=\s*__get_import\('react', false\)/,
      );
    });

    it("preserves aliasing using destructure rename syntax", () => {
      const output = transform(`import { useEffect as effect } from 'react';`);

      expect(output).toContain("useEffect: effect");
    });

    it("handles multiple named imports in one statement", () => {
      const output = transform(
        `import { useState, useEffect } from 'react';`,
      );

      expect(output).toContain("useState");
      expect(output).toContain("useEffect");
      expect(output).toMatch(/__get_import\('react', false\)/);
    });

    it("handles a default + named import from the same statement", () => {
      const output = transform(`import React, { useState } from 'react';`);

      expect(output).toMatch(/const React = __get_import\('react', true\)/);
      expect(output).toMatch(
        /const\s*\{\s*useState\s*\}\s*=\s*__get_import\('react', false\)/,
      );
    });
  });

  describe("undefined import validation", () => {
    it("injects a validation check keyed by the local (aliased) name", () => {
      const output = transform(`import { useEffect as effect } from 'react';`);

      expect(output).toContain("if (effect === undefined)");
      expect(output).not.toContain("if (useEffect === undefined)");
      expect(output).toContain(
        "Import 'effect' from 'react' is undefined",
      );
    });

    it("injects one validation check per named import", () => {
      const output = transform(
        `import { useState, useEffect } from 'react';`,
      );

      expect(output).toContain("if (useState === undefined)");
      expect(output).toContain("if (useEffect === undefined)");
    });

    it("does not add validation for default or namespace imports", () => {
      const output = transform(`import React from 'react';`);

      expect(output).not.toContain("=== undefined");
    });
  });

  describe("auto React import", () => {
    it("injects a React import when none is present in the source", () => {
      const output = transform(`const x = 1;`);

      expect(output).toMatch(/const React = __get_import\('react', true\)/);
    });

    it("does not duplicate the React import when already present", () => {
      const output = transform(`import React from 'react';`);

      const matches = output.match(/__get_import\('react', true\)/g) ?? [];
      expect(matches).toHaveLength(1);
    });
  });

  describe("export transform", () => {
    it("rewrites a named export into an exports.default assignment", () => {
      const output = transform(
        `const MyComponent = () => null; export { MyComponent };`,
      );

      expect(output).toContain("exports.default = MyComponent");
      expect(output).not.toMatch(/export\s*\{/);
    });
  });
});
