export type Files = Record<string, string>;

export type PlaygroundProps = {
	files: Files;
	entryFileName: string;
};
