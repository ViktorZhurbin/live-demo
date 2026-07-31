/**
 * Parses a fenced code block's `meta` string for the two tokens this plugin
 * cares about: the bare `live` flag and a `file="..."` entry. Extracts the
 * same tokens, quote-stripping included, as @rspress/core's own
 * `remarkFileCodeBlock` (`dist/node/mdx/remarkPlugins/fileCodeBlock.js`'s
 * `parseFileFromMeta`), including its first-`file=`-wins tie-break — but not a
 * byte-for-byte reimplementation of its tokenizer.
 *
 * The one deliberate divergence is `tokenize` below: core splits on a literal
 * `' '`, this respects quotes. Core's way both mis-reads a tab-separated meta
 * and, worse, reads a bare word inside someone else's quoted value (`title="A
 * live demo"`) as a token of its own — which here would silently turn a plain
 * code block into a demo. Where that divergence can change which *file* is
 * read, it can only cost core a path it then fails loudly on; matching its
 * prefix rules, the part a disagreement would silently mis-resolve, is handled
 * in `resolvePrefixedPath`.
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
	const tokens = tokenize(meta);

	let file: string | undefined;
	for (const token of tokens) {
		const [key, value = ""] = token.split("=");
		// First one wins, matching core — a second `file=` is nonsense input,
		// but the two halves disagreeing on which file it names isn't.
		if (key === "file" && value.length > 0) {
			file = value.replace(/["'`]/g, "");
			break;
		}
	}

	return {
		isLive: tokens.includes("live") || tokens.includes("playground"),
		file,
	};
};

/**
 * Splits on whitespace *outside* quotes, so a quoted value stays one token
 * however many spaces it contains. Quotes are kept — the `file=` branch above
 * strips them where they matter, and `isLive`'s whole-token match relies on
 * them still being there to tell `live` from `title="a live demo"`.
 *
 * An unbalanced quote (`title=Bob's demo live`) swallows the rest of the meta
 * into one token, so a trailing `live` stops matching. Left alone: core only
 * reads `file=`, and its own space-splitting mangles an unbalanced quote there
 * too — either way the failure is a demo that doesn't render, never one that
 * renders from the wrong file. A properly quoted `title="Bob's demo"` is
 * unaffected, since the apostrophe sits inside an already-open quote.
 */
function tokenize(meta: string | null | undefined): string[] {
	const tokens: string[] = [];
	let current = "";
	let openQuote: string | undefined;

	for (const char of meta ?? "") {
		if (openQuote) {
			if (char === openQuote) openQuote = undefined;
		} else if (char === '"' || char === "'" || char === "`") {
			openQuote = char;
		} else if (/\s/.test(char)) {
			if (current) tokens.push(current);
			current = "";
			continue;
		}

		current += char;
	}

	if (current) tokens.push(current);

	return tokens;
}
