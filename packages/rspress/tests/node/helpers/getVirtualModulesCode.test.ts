import { getVirtualModulesCode } from "node/helpers/getVirtualModulesCode";
import { describe, expect, it } from "vitest";

describe("getVirtualModulesCode", () => {
  it("should generate virtual module code with single import", () => {
    const imports = new Set(["react"]);
    const result = getVirtualModulesCode(imports);

    expect(result).toContain("import * as i_0 from 'react'");
    expect(result).toContain("importsMap.set('react', i_0)");
    expect(result).toContain("function getImport(importName, getDefault)");
    expect(result).toContain("export default getImport");
  });

  it("should generate virtual module code with multiple imports", () => {
    const imports = new Set(["react", "react-dom", "lodash"]);
    const result = getVirtualModulesCode(imports);

    expect(result).toContain("import * as i_0 from 'react'");
    expect(result).toContain("importsMap.set('react', i_0)");

    expect(result).toContain("import * as i_1 from 'react-dom'");
    expect(result).toContain("importsMap.set('react-dom', i_1)");

    expect(result).toContain("import * as i_2 from 'lodash'");
    expect(result).toContain("importsMap.set('lodash', i_2)");
  });

  it("should handle empty imports set", () => {
    const imports = new Set<string>([]);
    const result = getVirtualModulesCode(imports);

    // Should still include the getImport function
    expect(result).toContain("function getImport(importName, getDefault)");
    expect(result).toContain("export default getImport");

    // Should not have any import statements
    expect(result).not.toContain("import * as");
  });

  it("should handle imports with special characters in names", () => {
    const imports = new Set(["@testing-library/react", "@babel/core"]);
    const result = getVirtualModulesCode(imports);

    expect(result).toContain("import * as i_0 from '@testing-library/react'");
    expect(result).toContain("importsMap.set('@testing-library/react', i_0)");

    expect(result).toContain("import * as i_1 from '@babel/core'");
    expect(result).toContain("importsMap.set('@babel/core', i_1)");
  });

  it("should handle imports with slashes", () => {
    const imports = new Set(["rspress/theme"]);
    const result = getVirtualModulesCode(imports);

    expect(result).toContain("import * as i_0 from 'rspress/theme'");
    expect(result).toContain("importsMap.set('rspress/theme', i_0)");
  });

  it("should maintain consistent import numbering", () => {
    const imports = new Set(["a", "b", "c", "d", "e"]);
    const result = getVirtualModulesCode(imports);

    // Check that imports are numbered sequentially
    expect(result).toContain("i_0");
    expect(result).toContain("i_1");
    expect(result).toContain("i_2");
    expect(result).toContain("i_3");
    expect(result).toContain("i_4");
  });

  it("should generate code that includes error handling", () => {
    const imports = new Set(["react"]);
    const result = getVirtualModulesCode(imports);

    expect(result).toContain("if (!result)");
    expect(result).toContain("throw new Error");
    expect(result).toContain("Can't resolve");
  });

  it("should include default export handling logic", () => {
    const imports = new Set(["react"]);
    const result = getVirtualModulesCode(imports);

    expect(result).toContain('if (getDefault && typeof result === "object")');
    expect(result).toContain("return result.default || result");
  });
});
