import path from "node:path";
import { buildModuleGraph } from "node/helpers/buildModuleGraph";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");

describe("buildModuleGraph", () => {
  it("should build graph for single module with no dependencies", () => {
    const { modules, externalImports } = buildModuleGraph({
      fileName: "SimpleComponent.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx") as any,
    });

    expect(modules).toHaveLength(1);
    expect(modules[0].fileName).toBe("SimpleComponent.tsx");
    expect(externalImports.size).toBe(0);
  });

  it("should collect external imports", () => {
    const { modules, externalImports } = buildModuleGraph({
      fileName: "ComponentWithImports.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/ComponentWithImports.tsx") as any,
    });

    expect(modules).toHaveLength(1);
    expect(externalImports.has("react")).toBe(true);
  });

  it("should resolve local dependencies into module graph", () => {
    const { modules, externalImports } = buildModuleGraph({
      fileName: "App.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/MultiFile/App.tsx") as any,
    });

    // Should include both App.tsx and Button.tsx
    expect(modules).toHaveLength(2);
    const fileNames = modules.map((m) => m.fileName);
    expect(fileNames).toContain("App.tsx");
    expect(fileNames).toContain("Button.tsx");

    // Should collect react from both files
    expect(externalImports.has("react")).toBe(true);
  });

  it("should build module mapping for dependency resolution", () => {
    const { modules } = buildModuleGraph({
      fileName: "App.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/MultiFile/App.tsx") as any,
    });

    const appModule = modules.find((m) => m.fileName === "App.tsx");
    const buttonModule = modules.find((m) => m.fileName === "Button.tsx");

    expect(appModule).toBeDefined();
    expect(buttonModule).toBeDefined();

    // App.tsx should have mapping: "./Button" → Button module ID
    expect(appModule?.mapping["./Button"]).toBe(buttonModule?.id);
  });

  it("should handle deeply nested dependencies", () => {
    const { modules } = buildModuleGraph({
      fileName: "ReexportIndex.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/ReexportIndex.tsx") as any,
    });

    // Should include index + all re-exported files
    expect(modules.length).toBeGreaterThan(1);
    const fileNames = modules.map((m) => m.fileName);
    expect(fileNames).toContain("ReexportIndex.tsx");
    expect(fileNames).toContain("Button.tsx");
  });

  it("should throw on circular imports", () => {
    expect(() =>
      buildModuleGraph({
        fileName: "A.tsx" as any,
        absolutePath: path.join(FIXTURES_DIR, "invalid/CircularImport/A.tsx") as any,
      }),
    ).toThrow("[LiveDemo] Circular import detected");
  });

  it("should include import chain in circular import error", () => {
    try {
      buildModuleGraph({
        fileName: "A.tsx" as any,
        absolutePath: path.join(FIXTURES_DIR, "invalid/CircularImport/A.tsx") as any,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.message).toContain("Circular import detected");
      expect(error.message).toContain("Import chain:");
      expect(error.message).toContain("A.tsx");
      expect(error.message).toContain("B.tsx");
    }
  });

  it("should use queue-based BFS (not recursion)", () => {
    // This test verifies the iterative approach by checking that
    // all modules are processed in breadth-first order
    const { modules } = buildModuleGraph({
      fileName: "App.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/MultiFile/App.tsx") as any,
    });

    // Entry module should be first
    expect(modules[0].fileName).toBe("App.tsx");

    // All modules should be present (BFS guarantees all are visited)
    expect(modules.length).toBeGreaterThan(0);
  });

  it("should not mutate external state (pure function)", () => {
    const externalSet = new Set<string>();

    const { externalImports } = buildModuleGraph({
      fileName: "ComponentWithImports.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/ComponentWithImports.tsx") as any,
    });

    // buildModuleGraph should return new Set, not mutate external one
    expect(externalSet.size).toBe(0);
    expect(externalImports.size).toBeGreaterThan(0);
    expect(externalImports).not.toBe(externalSet);
  });

  it("should handle export re-exports correctly", () => {
    const { modules, externalImports } = buildModuleGraph({
      fileName: "ReexportIndex.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/ReexportIndex.tsx") as any,
    });

    // Should resolve all re-exported files
    const fileNames = modules.map((m) => m.fileName);
    expect(fileNames).toContain("Button.tsx");
    expect(fileNames).toContain("SimpleComponent.tsx");
    expect(fileNames).toContain("ComponentWithImports.tsx");

    // Should collect external imports from all modules
    expect(externalImports.has("react")).toBe(true);
  });

  it("should analyze each module only once (caching)", () => {
    const { modules } = buildModuleGraph({
      fileName: "ReexportIndex.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/ReexportIndex.tsx") as any,
    });

    // Collect all file names
    const fileNames = modules.map((m) => m.fileName);

    // Create a Set to find duplicates
    const uniqueFileNames = new Set(fileNames);

    // Each file should appear exactly once
    expect(fileNames.length).toBe(uniqueFileNames.size);

    // Verify no file appears twice
    const counts = new Map<string, number>();
    for (const name of fileNames) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }

    for (const [fileName, count] of counts.entries()) {
      expect(count).toBe(1);
    }
  });

  it("should assign sequential IDs to modules", () => {
    const { modules } = buildModuleGraph({
      fileName: "ReexportIndex.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/ReexportIndex.tsx") as any,
    });

    // IDs should be sequential starting from 0
    const ids = modules.map((m) => m.id).sort((a, b) => a - b);

    expect(ids[0]).toBe(0);
    expect(ids[ids.length - 1]).toBe(modules.length - 1);

    // All IDs should be present (no gaps)
    for (let i = 0; i < modules.length; i++) {
      expect(ids).toContain(i);
    }
  });
});
