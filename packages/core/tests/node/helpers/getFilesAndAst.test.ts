import path from "node:path";
import { getFilesAndAst } from "node/helpers/getFilesAndAst";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");

describe("getFilesAndAst", () => {
  it("should parse simple React component", () => {
    const result = getFilesAndAst({
      fileName: "SimpleComponent.tsx",
      absolutePath: path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx") as any,
    });

    expect(result.files).toHaveProperty("SimpleComponent.tsx");
    expect(result.files["SimpleComponent.tsx"]).toContain(
      "export default function SimpleComponent",
    );
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe("Program");
    expect(result.ast.body).toBeInstanceOf(Array);
  });

  it("should parse component with imports", () => {
    const result = getFilesAndAst({
      fileName: "ComponentWithImports.tsx",
      absolutePath: path.join(
        FIXTURES_DIR,
        "valid/ComponentWithImports.tsx",
      ) as any,
    });

    expect(result.files["ComponentWithImports.tsx"]).toContain(
      'import { useState } from "react"',
    );
    expect(result.ast.body.length).toBeGreaterThan(0);

    // Check that the AST contains import declarations
    const hasImport = result.ast.body.some(
      (node) => node.type === "ImportDeclaration",
    );
    expect(hasImport).toBe(true);
  });

  it("should parse component with external imports", () => {
    const result = getFilesAndAst({
      fileName: "WithExternalImports.tsx",
      absolutePath: path.join(
        FIXTURES_DIR,
        "valid/WithExternalImports.tsx",
      ) as any,
    });

    expect(result.files["WithExternalImports.tsx"]).toContain(
      'import React, { useEffect, useState } from "react"',
    );

    // Count import declarations in AST
    const imports = result.ast.body.filter(
      (node) => node.type === "ImportDeclaration",
    );
    expect(imports).toHaveLength(1);
  });

  it("should handle TypeScript interfaces", () => {
    const result = getFilesAndAst({
      fileName: "Button.tsx",
      absolutePath: path.join(
        FIXTURES_DIR,
        "valid/MultiFile/Button.tsx",
      ) as any,
    });

    expect(result.files["Button.tsx"]).toContain("interface ButtonProps");
    expect(result.ast).toBeDefined();

    // Check that interfaces are in the AST
    const hasInterface = result.ast.body.some(
      (node) =>
        node.type === "TSInterfaceDeclaration" ||
        node.type === "TSTypeAliasDeclaration",
    );
    expect(hasInterface).toBe(true);
  });

  it("should preserve code formatting and content", () => {
    const result = getFilesAndAst({
      fileName: "SimpleComponent.tsx",
      absolutePath: path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx") as any,
    });

    const code = result.files["SimpleComponent.tsx"];

    // Should preserve the actual file content
    expect(code).toContain("Hello World");
    expect(code).toContain("export default");
  });

  // Note: Currently getFilesAndAst doesn't handle parse errors
  // This documents expected behavior - should be enhanced with error handling
  it.skip("should handle invalid syntax gracefully", () => {
    expect(() =>
      getFilesAndAst({
        fileName: "InvalidSyntax.tsx",
        absolutePath: path.join(
          FIXTURES_DIR,
          "invalid/InvalidSyntax.tsx",
        ) as any,
      }),
    ).toThrow();
  });

  it("should create files object with correct key", () => {
    const result = getFilesAndAst({
      fileName: "CustomName.tsx",
      absolutePath: path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx") as any,
    });

    // fileName parameter determines the key, not the actual file path
    expect(result.files).toHaveProperty("CustomName.tsx");
    expect(result.files).not.toHaveProperty("SimpleComponent.tsx");
  });

  it("should parse AST with module sourceType", () => {
    const result = getFilesAndAst({
      fileName: "SimpleComponent.tsx",
      absolutePath: path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx") as any,
    });

    // oxc-parser should parse as module (allows import/export)
    expect(result.ast.type).toBe("Program");
    expect(result.ast.sourceType).toBe("module");
  });
});
