import "@live-demo/rspress/web/index.css";
import { LiveDemoCore } from "@live-demo/rspress/web";
import { useDark } from "@rspress/core/runtime";
// @ts-expect-error: resourceQuery is set up in rspack configuration
import importedCode from "../docs/guide/external/snippets/multiFile/Imported.tsx?raw";
// @ts-expect-error
import multiFileCode from "../docs/guide/external/snippets/multiFile/MultiFile.tsx?raw";

export const HomeDemo = () => {
  const isDark = useDark();

  return (
    <LiveDemoCore
      isDark={isDark}
      pluginProps={{
        files: JSON.stringify({
          "MultiFile.tsx": multiFileCode,
          "Imported.tsx": importedCode,
        }),
        entryFileName: JSON.stringify("MultiFile.tsx"),
        options: JSON.stringify({
          resizablePanels: {
            defaultPanelSizes: { editor: 70, preview: 40 },
          },
        }),
      }}
    />
  );
};
