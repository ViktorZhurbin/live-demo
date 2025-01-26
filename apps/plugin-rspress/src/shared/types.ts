import type {
  LiveDemoFileTabsProps,
  LiveDemoResizablePanelsProps,
} from "web/ui";
import type { LiveDemoLanguage } from "./constants";

export type PathWithAllowedExt = `${string}.${LiveDemoLanguage}`;

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
  customLayout?: string;
  /**
   * Modules that will be available in demos,
   * @example
   * includeModules: ["@mantine/hooks"]
   * Then you can use `import { ... } from "@mantine/hooks"` in any demo.
   **/
  includeModules?: string[];

  ui?: {
    fileTabs?: Pick<LiveDemoFileTabsProps, "hideSingleTab">;
    resizablePanels?: Pick<
      LiveDemoResizablePanelsProps,
      "autoSaveId" | "defaultPanelSizes"
    >;
  };
};
