import type {
  LiveDemoEditorProps,
  LiveDemoFileTabsProps,
  LiveDemoResizablePanelsProps,
} from "web/ui";
import type { LiveDemoLanguage } from "./constants";

export type PathWithAllowedExt = `${string}.${LiveDemoLanguage}`;

/**
 * `Record<fileName, fileContentsString>`
 */
export type LiveDemoFiles = Record<string, string>;

export type LiveDemoProps = {
  files: LiveDemoFiles;
  entryFileName: string;
  options?: PluginOptions["ui"];
};

/**
 * Props passed from plugin to LiveDemo components are JSON.stringified.
 * Without stringification having code strings (in `props.files`)
 * tends to break MDX parsing.
 */
export type LiveDemoStringifiedProps = {
  [Key in keyof LiveDemoProps]: string;
};

export type PluginOptions = {
  /**
   * Path to custom layout file.
   * @example
   * customLayout: "./path/to/LiveDemo.tsx"
   **/
  customLayout?: string;
  /**
   * Modules that will be available in demos,
   * @example
   * includeModules: ["@mantine/hooks"]
   * Then you can use `import { ... } from "@mantine/hooks"` in any demo.
   **/
  includeModules?: string[];

  /**
   * Props passed from plugin to LiveDemo components.
   * @example
   * ui: {
   *   fileTabs: {
   *     hideSingleTab: true,
   *   },
   *   editor: {
   *     basicSetup: {
   *       lineNumbers: false,
   *       foldGutter: false,
   *       autocompletion: false,
   *       tabSize: 2,
   *     },
   *   },
   *   resizablePanels: {
   *     autoSaveId: "my-auto-save-id",
   *     defaultPanelSizes: {
   *       editor: 50,
   *       preview: 50,
   *     },
   *   },
   * }
   */
  ui?: {
    fileTabs?: Pick<LiveDemoFileTabsProps, "hideSingleTab">;
    editor?: LiveDemoEditorProps;
    resizablePanels?: Pick<
      LiveDemoResizablePanelsProps,
      "autoSaveId" | "defaultPanelSizes"
    >;
  };
};
