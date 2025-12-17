import path from "node:path";
import { resolveFileInfo } from "node/helpers/resolveFileInfo";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = path.join(__dirname, "../../fixtures");

describe("resolveFileInfo", () => {
  it("should resolve file with explicit extension", () => {
    const result = resolveFileInfo({
      dirname: path.join(FIXTURES_DIR, "valid"),
      importPath: "./SimpleComponent.tsx",
    });

    expect(result.fileName).toBe("SimpleComponent.tsx");
    expect(result.absolutePath).toContain("SimpleComponent.tsx");
    expect(result.absolutePath).toContain("fixtures/valid");
  });

  it("should resolve file without extension", () => {
    const result = resolveFileInfo({
      dirname: path.join(FIXTURES_DIR, "valid"),
      importPath: "./SimpleComponent",
    });

    expect(result.fileName).toBe("SimpleComponent.tsx");
    expect(result.absolutePath).toContain("SimpleComponent.tsx");
  });

  it("should resolve file in nested directory", () => {
    const result = resolveFileInfo({
      dirname: path.join(FIXTURES_DIR, "valid/MultiFile"),
      importPath: "./Button",
    });

    expect(result.fileName).toBe("Button.tsx");
    expect(result.absolutePath).toContain("MultiFile/Button.tsx");
  });

  it("should resolve file with relative parent path", () => {
    const result = resolveFileInfo({
      dirname: path.join(FIXTURES_DIR, "valid/MultiFile"),
      importPath: "../SimpleComponent",
    });

    expect(result.fileName).toBe("SimpleComponent.tsx");
    expect(result.absolutePath).toContain("fixtures/valid/SimpleComponent.tsx");
  });

  it("should throw error for non-existent file", () => {
    expect(() =>
      resolveFileInfo({
        dirname: path.join(FIXTURES_DIR, "valid"),
        importPath: "./DoesNotExist",
      }),
    ).toThrow("[LiveDemo]: Couldn't resolve `./DoesNotExist`");

    expect(() =>
      resolveFileInfo({
        dirname: path.join(FIXTURES_DIR, "valid"),
        importPath: "./DoesNotExist",
      }),
    ).toThrow("Only .js(x) and .ts(x) files are supported");
  });

  it("should throw error for file with unsupported extension", () => {
    // This would throw an error from getPossiblePaths before fs.existsSync
    expect(() =>
      resolveFileInfo({
        dirname: path.join(FIXTURES_DIR, "valid"),
        importPath: "./file.py",
      }),
    ).toThrow();
  });

  it("should prefer tsx over other extensions when multiple exist", () => {
    // If a file exists with .tsx extension, it should be found first
    const result = resolveFileInfo({
      dirname: path.join(FIXTURES_DIR, "valid"),
      importPath: "./SimpleComponent",
    });

    // Based on getPossiblePaths order, it checks ts, tsx, js, jsx
    expect(result.fileName).toMatch(/\.tsx$/);
  });
});
