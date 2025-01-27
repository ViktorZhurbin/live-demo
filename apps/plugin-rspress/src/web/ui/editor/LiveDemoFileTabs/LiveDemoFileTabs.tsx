import { useLiveDemoContext } from "web/context";
import { Button } from "web/ui/components";
import styles from "./LiveDemoFileTabs.module.css";

export type LiveDemoFileTabsProps = {
  /**
   * Hide single file tab
   * @defaultValue `false`
   */
  hideSingleTab?: boolean;
};

export const LiveDemoFileTabs = (props: LiveDemoFileTabsProps) => {
  const { files, activeFile, setActiveFile, options } = useLiveDemoContext();
  const mergedOptions = Object.assign(options?.fileTabs ?? {}, props);

  const { hideSingleTab } = mergedOptions;
  const fileNames = Object.keys(files);

  if (hideSingleTab && fileNames.length === 1) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      {fileNames.map((name) => {
        return (
          <Button
            key={name}
            className={styles.tab}
            data-active={name === activeFile}
            onClick={() => {
              setActiveFile(name);
            }}
          >
            {name}
          </Button>
        );
      })}
    </div>
  );
};
