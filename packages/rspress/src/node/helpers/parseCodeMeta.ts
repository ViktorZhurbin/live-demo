/**
 * Parses a fenced code block's `meta` string for the two tokens this plugin
 * cares about: the bare `live` flag and a `file="..."` entry. Extracts the
 * same tokens, quote-stripping included, as @rspress/core's own
 * `remarkFileCodeBlock` (`dist/node/mdx/remarkPlugins/fileCodeBlock.js`'s
 * `parseFileFromMeta`) — not a byte-for-byte reimplementation of its
 * tokenizer.
 */
type CodeMeta = {
	isLive: boolean;
	/** The raw, still-prefixed path from `file="..."`, if present. */
	file?: string;
};

export const parseCodeMeta = (meta: string | null | undefined): CodeMeta => {
	const tokens = meta?.split(/\s+/).filter(Boolean) ?? [];

	let file: string | undefined;
	for (const token of tokens) {
		const [key, value = ""] = token.split("=");
		if (key === "file" && value.length > 0) {
			file = value.replace(/["'`]/g, "");
		}
	}

	return { isLive: tokens.includes("live"), file };
};
