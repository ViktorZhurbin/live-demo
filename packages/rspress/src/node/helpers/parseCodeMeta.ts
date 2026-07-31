/**
 * Parses a fenced code block's `meta` string for the two tokens this plugin
 * cares about: the bare `live` flag and a `file="..."` entry. Extracts the
 * same tokens, quote-stripping included, as @rspress/core's own
 * `remarkFileCodeBlock` (`dist/node/mdx/remarkPlugins/fileCodeBlock.js`'s
 * `parseFileFromMeta`) — not a byte-for-byte reimplementation of its
 * tokenizer. The one known divergence, deliberately left alone: core splits
 * on a literal `' '` where this splits on `/\s+/`, so a tab-separated meta
 * parses here and yields a corrupt path in core. Core fails loudly on its own
 * in that case, and matching its prefix rules — the part a disagreement would
 * actually silently mis-resolve — is handled in `resolvePrefixedPath`.
 *
 * `playground` is accepted as an alias for `live`, so a site migrating off
 * `@rspress/plugin-playground` can swap the plugin registration without
 * touching its MDX. See `website/docs/guide/usage.mdx` for the tradeoff this
 * implies (this plugin can't coexist with the official one on the same site
 * once `playground` fences are in play).
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

	return {
		isLive: tokens.includes("live") || tokens.includes("playground"),
		file,
	};
};
