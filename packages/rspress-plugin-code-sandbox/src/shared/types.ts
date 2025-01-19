export type Files = Record<string, string>;

export type PlaygroundProps = {
	files: Record<string, string>;
	dependencies: Record<string, string>;
};
