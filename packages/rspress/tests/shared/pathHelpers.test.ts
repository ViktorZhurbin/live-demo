import {
  getFileExt,
  getPossiblePaths,
  isRelativeImport,
  stripRelativeImport,
} from "shared/pathHelpers";
import { describe, expect, it } from "vitest";

describe("pathHelpers", () => {
  describe("isRelativeImport", () => {
    it("should return true for ./ imports", () => {
      expect(isRelativeImport("./Button")).toBe(true);
      expect(isRelativeImport("./components/Button")).toBe(true);
      expect(isRelativeImport("./Button.tsx")).toBe(true);
    });

    it("should return true for ../ imports", () => {
      expect(isRelativeImport("../Button")).toBe(true);
      expect(isRelativeImport("../../components/Button")).toBe(true);
      expect(isRelativeImport("../Button.tsx")).toBe(true);
    });

    it("should return false for absolute imports", () => {
      expect(isRelativeImport("react")).toBe(false);
      expect(isRelativeImport("@/components/Button")).toBe(false);
      expect(isRelativeImport("lodash")).toBe(false);
    });

    it("should return false for paths without ./ or ../", () => {
      expect(isRelativeImport("Button")).toBe(false);
      expect(isRelativeImport("components/Button")).toBe(false);
    });
  });

  describe("stripRelativeImport", () => {
    it("should strip leading ./ from import", () => {
      expect(stripRelativeImport("./Button")).toBe("Button");
    });

    it("should strip leading ../ from import", () => {
      expect(stripRelativeImport("../Button")).toBe("Button");
    });

    it("should strip multiple dots and slashes", () => {
      expect(stripRelativeImport("../../Button")).toBe("Button");
    });

    it("should leave non-relative imports unchanged", () => {
      expect(stripRelativeImport("react")).toBe("react");
    });
  });

  describe("getFileExt", () => {
    it("should extract extension from filename", () => {
      expect(getFileExt("Button.tsx")).toBe("tsx");
      expect(getFileExt("Button.jsx")).toBe("jsx");
      expect(getFileExt("Button.ts")).toBe("ts");
      expect(getFileExt("Button.js")).toBe("js");
    });

    it("should handle files without extension", () => {
      expect(getFileExt("Button")).toBeUndefined();
    });

    it("should handle files with multiple dots", () => {
      expect(getFileExt("Button.test.tsx")).toBe("test");
    });

    it("should handle paths with directories", () => {
      expect(getFileExt("components/Button.tsx")).toBe("tsx");
    });
  });

  describe("getPossiblePaths", () => {
    it("should return single path when extension is provided and valid", () => {
      expect(getPossiblePaths("Button.tsx")).toEqual(["Button.tsx"]);
      expect(getPossiblePaths("Button.jsx")).toEqual(["Button.jsx"]);
      expect(getPossiblePaths("Button.ts")).toEqual(["Button.ts"]);
      expect(getPossiblePaths("Button.js")).toEqual(["Button.js"]);
    });

    it("should return all possible extensions when no extension provided", () => {
      const result = getPossiblePaths("Button");
      expect(result).toHaveLength(4);
      expect(result).toContain("Button.ts");
      expect(result).toContain("Button.tsx");
      expect(result).toContain("Button.js");
      expect(result).toContain("Button.jsx");
    });

    it("should work with paths containing directories", () => {
      const result = getPossiblePaths("components/Button");
      expect(result).toHaveLength(4);
      expect(result).toContain("components/Button.ts");
      expect(result).toContain("components/Button.tsx");
      expect(result).toContain("components/Button.js");
      expect(result).toContain("components/Button.jsx");
    });

    it("should throw error for unsupported extensions", () => {
      expect(() => getPossiblePaths("Button.py")).toThrow(
        "Couldn't resolve `Button.py`",
      );
      expect(() => getPossiblePaths("Button.py")).toThrow(
        "Only .jsx and .tsx files are supported",
      );
    });

    it("should handle absolute paths without extension", () => {
      // In practice, getPossiblePaths is called after stripRelativeImport()
      // or with absolute paths from path.join()
      const result = getPossiblePaths("/absolute/path/Button");
      expect(result).toHaveLength(4);
      expect(result).toContain("/absolute/path/Button.tsx");
    });

    it("should handle absolute paths with extension", () => {
      expect(getPossiblePaths("/absolute/path/Button.tsx")).toEqual([
        "/absolute/path/Button.tsx",
      ]);
    });
  });
});
