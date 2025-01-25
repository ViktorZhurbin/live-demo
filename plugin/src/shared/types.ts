import type { Language } from "./constants";

export type PathWithAllowedExt = `${string}.${Language}`;

export type Files = Record<string, string>;

export type PlaygroundProps = {
	files: Files;
	entryFileName: string;
};

/**
 * Props passed from plugin to Playground components are JSON.stringified.
 * Without stringification having code strings (in `props.files`)
 * tends to break MDX parsing.
 */
export type PlaygroundStringifiedProps = {
	[Key in keyof PlaygroundProps]: string;
};
