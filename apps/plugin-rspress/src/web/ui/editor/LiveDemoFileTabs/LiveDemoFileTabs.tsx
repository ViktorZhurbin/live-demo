import { useLiveDemoContext } from "web/context";
import { Button } from "web/ui/components";
import styles from "./LiveDemoFileTabs.module.css";

type LiveDemoFileTabsProps = {
  hideSingleTab?: boolean;
};

export const LiveDemoFileTabs = (props: LiveDemoFileTabsProps) => {
  const { files, activeFile, setActiveFile } = useLiveDemoContext();
  const fileNames = Object.keys(files);

  if (props.hideSingleTab && fileNames.length === 1) {
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
