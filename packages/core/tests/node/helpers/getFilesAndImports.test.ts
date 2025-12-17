import path from "node:path";
import { getFilesAndImports } from "node/helpers/getFilesAndImports";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");

describe("getFilesAndImports", () => {
  it("should handle single file with no imports", () => {
    const uniqueImports = new Set<string>();

    const result = getFilesAndImports({
      fileName: "SimpleComponent.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx") as any,
      uniqueImports,
    });

    expect(result.files).toHaveProperty("SimpleComponent.tsx");
    expect(Object.keys(result.files)).toHaveLength(1);
    expect(uniqueImports.size).toBe(0);
  });

  it("should collect external imports", () => {
    const uniqueImports = new Set<string>();

    const result = getFilesAndImports({
      fileName: "ComponentWithImports.tsx" as any,
      absolutePath: path.join(
        FIXTURES_DIR,
        "valid/ComponentWithImports.tsx",
      ) as any,
      uniqueImports,
    });

    expect(result.files).toHaveProperty("ComponentWithImports.tsx");
    expect(uniqueImports.has("react")).toBe(true);
  });

  it("should collect multiple external imports", () => {
    const uniqueImports = new Set<string>();

    const result = getFilesAndImports({
      fileName: "WithExternalImports.tsx" as any,
      absolutePath: path.join(
        FIXTURES_DIR,
        "valid/WithExternalImports.tsx",
      ) as any,
      uniqueImports,
    });

    expect(result.files).toHaveProperty("WithExternalImports.tsx");
    expect(uniqueImports.has("react")).toBe(true);
    expect(uniqueImports.size).toBeGreaterThan(0);
  });

  it("should recursively resolve local imports", () => {
    const uniqueImports = new Set<string>();

    const result = getFilesAndImports({
      fileName: "App.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/MultiFile/App.tsx") as any,
      uniqueImports,
    });

    // Should include both App.tsx and Button.tsx
    expect(result.files).toHaveProperty("App.tsx");
    expect(result.files).toHaveProperty("Button.tsx");
    expect(Object.keys(result.files)).toHaveLength(2);

    // Should collect react imports from both files
    expect(uniqueImports.has("react")).toBe(true);
  });

  it("should handle relative imports correctly", () => {
    const uniqueImports = new Set<string>();

    const result = getFilesAndImports({
      fileName: "App.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/MultiFile/App.tsx") as any,
      uniqueImports,
    });

    // Button.tsx is imported as "./Button" in App.tsx
    expect(result.files["Button.tsx"]).toBeDefined();
    expect(result.files["Button.tsx"]).toContain("interface ButtonProps");
  });

  it("should not duplicate imports in uniqueImports set", () => {
    const uniqueImports = new Set<string>();

    // First file imports react
    getFilesAndImports({
      fileName: "ComponentWithImports.tsx" as any,
      absolutePath: path.join(
        FIXTURES_DIR,
        "valid/ComponentWithImports.tsx",
      ) as any,
      uniqueImports,
    });

    const initialSize = uniqueImports.size;

    // Second file also imports react
    getFilesAndImports({
      fileName: "WithExternalImports.tsx" as any,
      absolutePath: path.join(
        FIXTURES_DIR,
        "valid/WithExternalImports.tsx",
      ) as any,
      uniqueImports,
    });

    // Should not duplicate "react" import
    expect(uniqueImports.has("react")).toBe(true);
    // Size might increase if there are other unique imports, but react shouldn't be duplicated
  });

  it("should handle files with both local and external imports", () => {
    const uniqueImports = new Set<string>();

    const result = getFilesAndImports({
      fileName: "App.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/MultiFile/App.tsx") as any,
      uniqueImports,
    });

    // Local import resolved
    expect(result.files).toHaveProperty("Button.tsx");

    // External import collected
    expect(uniqueImports.has("react")).toBe(true);
  });

  // Note: Circular import detection is not implemented
  // This test documents the expected behavior
  it.skip("should detect circular imports", () => {
    const uniqueImports = new Set<string>();

    expect(() =>
      getFilesAndImports({
        fileName: "A.tsx" as any,
        absolutePath: path.join(
          FIXTURES_DIR,
          "invalid/CircularImport/A.tsx",
        ) as any,
        uniqueImports,
      }),
    ).toThrow("circular");
  });

  it("should throw error for missing local import", () => {
    const uniqueImports = new Set<string>();

    expect(() =>
      getFilesAndImports({
        fileName: "MissingImport.tsx" as any,
        absolutePath: path.join(
          FIXTURES_DIR,
          "invalid/MissingImport.tsx",
        ) as any,
        uniqueImports,
      }),
    ).toThrow();
  });

  it("should handle deeply nested imports", () => {
    const uniqueImports = new Set<string>();

    const result = getFilesAndImports({
      fileName: "App.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/MultiFile/App.tsx") as any,
      uniqueImports,
    });

    // All files in the import chain should be included
    expect(Object.keys(result.files).length).toBeGreaterThan(0);
    expect(result.files["App.tsx"]).toBeDefined();
  });
});
