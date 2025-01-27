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

export type DemoDataByPath = Record<string, LiveDemoPropsFromPlugin>;

/**
 * Modules that will be available in demos.
 * @defaultValue `["react"]`
 *
 * These are collected from external demos at build time.
 *
 * You can also use `includeModules` option of the plugin,
 * to make some modules available in inline demos.
 **/
export type UniqueImports = Set<string>;

export type LiveDemoPropsFromPlugin = {
  files: LiveDemoFiles;
  entryFileName: string;
  options?: LiveDemoPluginOptions["ui"];
};

export type LiveDemoPluginOptions = {
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
    controlPanel?: {
      hide?: boolean;
    };
    fileTabs?: Pick<LiveDemoFileTabsProps, "hideSingleTab"> & {
      hide?: boolean;
    };
    editor?: LiveDemoEditorProps;
    resizablePanels?: Pick<
      LiveDemoResizablePanelsProps,
      "autoSaveId" | "defaultPanelSizes"
    >;
  };
};
