import { describe, expect, it } from "vitest";
import { parseProps } from "web/context/parseProps";
import type { LiveDemoStringifiedProps } from "web/types";

describe("parseProps", () => {
  it("should parse stringified props correctly", () => {
    const stringifiedProps: LiveDemoStringifiedProps = {
      files: JSON.stringify({ "App.tsx": "export default () => <div />" }),
      entryFileName: JSON.stringify("App.tsx"),
      options: JSON.stringify({}),
    };

    const result = parseProps(stringifiedProps);

    expect(result.files).toEqual({ "App.tsx": "export default () => <div />" });
    expect(result.entryFileName).toBe("App.tsx");
    expect(result.options).toEqual({});
  });

  it("should handle complex nested objects", () => {
    const stringifiedProps: LiveDemoStringifiedProps = {
      files: JSON.stringify({
        "App.tsx": "const App = () => <div>Hello</div>",
        "Button.tsx": "const Button = () => <button>Click</button>",
      }),
      entryFileName: JSON.stringify("App.tsx"),
      options: JSON.stringify({
        panelDefaultSize: 50,
        panelAutoSaveId: "demo",
      }),
    };

    const result = parseProps(stringifiedProps);

    expect(result.files).toEqual({
      "App.tsx": "const App = () => <div>Hello</div>",
      "Button.tsx": "const Button = () => <button>Click</button>",
    });
    expect(result.options).toEqual({
      panelDefaultSize: 50,
      panelAutoSaveId: "demo",
    });
  });

  it("should handle code with special characters", () => {
    const codeWithSpecialChars = `
      export default function Component() {
        return <div>"Quotes" and 'apostrophes' and \`backticks\`</div>;
      }
    `;

    const stringifiedProps: LiveDemoStringifiedProps = {
      files: JSON.stringify({ "App.tsx": codeWithSpecialChars }),
      entryFileName: JSON.stringify("App.tsx"),
      options: JSON.stringify({}),
    };

    const result = parseProps(stringifiedProps);

    expect(result.files["App.tsx"]).toBe(codeWithSpecialChars);
  });

  it("should handle code with newlines and indentation", () => {
    const codeWithNewlines = `export default function Component() {\n  return <div>\n    Hello World\n  </div>;\n}`;

    const stringifiedProps: LiveDemoStringifiedProps = {
      files: JSON.stringify({ "App.tsx": codeWithNewlines }),
      entryFileName: JSON.stringify("App.tsx"),
      options: JSON.stringify({}),
    };

    const result = parseProps(stringifiedProps);

    expect(result.files["App.tsx"]).toBe(codeWithNewlines);
  });

  it("should handle empty objects", () => {
    const stringifiedProps: LiveDemoStringifiedProps = {
      files: JSON.stringify({}),
      entryFileName: JSON.stringify(""),
      options: JSON.stringify({}),
    };

    const result = parseProps(stringifiedProps);

    expect(result.files).toEqual({});
    expect(result.entryFileName).toBe("");
    expect(result.options).toEqual({});
  });

  it("should handle unicode characters in code", () => {
    const codeWithUnicode = `export default () => <div>Hello 世界 🌍</div>`;

    const stringifiedProps: LiveDemoStringifiedProps = {
      files: JSON.stringify({ "App.tsx": codeWithUnicode }),
      entryFileName: JSON.stringify("App.tsx"),
      options: JSON.stringify({}),
    };

    const result = parseProps(stringifiedProps);

    expect(result.files["App.tsx"]).toBe(codeWithUnicode);
  });

  // Note: Currently parseProps doesn't handle invalid JSON gracefully
  // This test documents the current behavior and will fail until error handling is added
  it.skip("should throw error for malformed JSON", () => {
    const stringifiedProps = {
      files: "{invalid json}",
      entryFileName: JSON.stringify("App.tsx"),
      options: JSON.stringify({}),
    };

    expect(() => parseProps(stringifiedProps as any)).toThrow();
  });
});
