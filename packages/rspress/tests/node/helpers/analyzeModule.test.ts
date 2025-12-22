import path from "node:path";
import { analyzeModule } from "node/helpers/analyzeModule";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");

describe("analyzeModule", () => {
  it("should analyze a single module with no dependencies", () => {
    const module = analyzeModule({
      fileName: "SimpleComponent.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx") as any,
    });

    expect(module).toHaveProperty("id");
    expect(typeof module.id).toBe("number");
    expect(module.fileName).toBe("SimpleComponent.tsx");
    expect(module.absolutePath).toContain("SimpleComponent.tsx");
    expect(module.dependencies).toEqual([]);
    expect(module.content).toBeDefined();
    expect(module.content.length).toBeGreaterThan(0);
    expect(module.mapping).toEqual({});
  });

  it("should extract external dependencies", () => {
    const module = analyzeModule({
      fileName: "ComponentWithImports.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/ComponentWithImports.tsx") as any,
    });

    expect(module.dependencies).toContain("react");
    expect(module.dependencies.length).toBeGreaterThan(0);
  });

  it("should extract local dependencies", () => {
    const module = analyzeModule({
      fileName: "App.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/MultiFile/App.tsx") as any,
    });

    expect(module.dependencies).toContain("./Button");
    expect(module.dependencies).toContain("react");
  });

  it("should extract dependencies from export re-exports", () => {
    const module = analyzeModule({
      fileName: "ReexportIndex.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/ReexportIndex.tsx") as any,
    });

    // Should find export { Button } from './Button'
    expect(module.dependencies).toContain("./Button");
    // Should find export { default as SimpleComponent } from './SimpleComponent'
    expect(module.dependencies).toContain("./SimpleComponent");
    // Should find export * from './ComponentWithImports'
    expect(module.dependencies).toContain("./ComponentWithImports");
  });

  it("should initialize module with placeholder ID", () => {
    const module = analyzeModule({
      fileName: "SimpleComponent.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx") as any,
    });

    // ID is assigned by buildModuleGraph, so it starts as -1
    expect(module.id).toBe(-1);
  });

  it("should include file content", () => {
    const module = analyzeModule({
      fileName: "SimpleComponent.tsx" as any,
      absolutePath: path.join(FIXTURES_DIR, "valid/SimpleComponent.tsx") as any,
    });

    expect(module.content).toContain("export function SimpleComponent");
    expect(module.content).toContain("Hello World");
  });
});
