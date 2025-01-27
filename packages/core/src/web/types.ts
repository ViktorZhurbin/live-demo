import type { LiveDemoPropsFromPlugin } from "shared/types";

/**
 * Props passed from plugin to LiveDemo components are JSON.stringified.
 * Without stringification having code strings (in `props.files`)
 * tends to break MDX parsing.
 */
export type LiveDemoStringifiedProps = {
  [Key in keyof LiveDemoPropsFromPlugin]: string;
};
