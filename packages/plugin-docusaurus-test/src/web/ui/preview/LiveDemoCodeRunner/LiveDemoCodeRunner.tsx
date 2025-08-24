import { useDebouncedCallback } from "@mantine/hooks";
import { createElement, type ReactElement, useEffect, useState } from "react";
import type { LiveDemoFiles } from "shared/types";
import { bundleCode } from "./compiler/bundleCode";
import { getFnFromString } from "./compiler/getFnFromString";

const DEBOUNCE_TIME = 800;

export type LiveDemoCodeRunnerProps = {
  files: LiveDemoFiles;
  entryFileName: string;

  error: Error | undefined;
  setError: (error: Error | undefined) => void;
};

export const LiveDemoCodeRunner = ({
  files,
  error,
  setError,
  entryFileName,
}: LiveDemoCodeRunnerProps) => {
  const [prevCode, setPrevCode] = useState("");
  const [dynamicComponent, setDynamicComponent] = useState<ReactElement | null>(
    null,
  );

  const getComponent = async (files: LiveDemoFiles) => {
    if (!(window.Babel || window.rollup)) return;

    try {
      const start = performance.now();
      const code = await bundleCode({ entryFileName, files });
      const end = performance.now();

      const diff = Math.round(end - start);

      console.info(
        `%cBundled in ${diff}ms`,
        "background: #15889f; padding: 6px; color: white;",
      );

      if (code === prevCode && !error) return;

      console.log({ code });

      const component = getFnFromString(code);

      if (typeof component === "function") {
        setError(undefined);
        setPrevCode(code);
        setDynamicComponent(createElement(component));
      } else {
        throw new Error(
          `Couldn't determine a function export in ${entryFileName}.\n\nThe code needs to export a function.`,
        );
      }
    } catch (e) {
      console.error(e);
      setError(e as Error);
    }
  };

  const getComponentDebounced = useDebouncedCallback(
    getComponent,
    DEBOUNCE_TIME,
  );

  useEffect(() => {
    getComponentDebounced(files);
  }, [getComponentDebounced, files]);

  return dynamicComponent;
};
