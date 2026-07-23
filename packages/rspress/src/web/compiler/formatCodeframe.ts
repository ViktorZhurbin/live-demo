/**
 * Render a source excerpt with a caret at a parse error's location, in the
 * same visual shape build-time oxc codeframes use (`readAndParseFile.ts`),
 * so a `PARSE_FAILED` reads the same regardless of which parser produced it.
 * Sucrase doesn't ship a codeframe itself — only `err.pos`/`err.loc` (see
 * `transformCode.ts`) — so this fills that gap by hand.
 */
export function formatCodeframe(
	source: string,
	filePath: string,
	loc: { line: number; column: number } | undefined,
): string | undefined {
	// Sucrase only attaches `loc` when its parser's own `augmentError` catches
	// the error (see the module docblock); guard the rest defensively too, in
	// case a location survives but no longer matches the source it's paired with.
	if (!loc) return undefined;

	const lines = source.split("\n");
	const { line, column } = loc;
	if (line < 1 || line > lines.length || column < 1) return undefined;

	const firstLine = Math.max(1, line - 1);
	const lastLine = Math.min(lines.length, line + 1);
	const gutterWidth = String(lastLine).length + 1;
	const gutter = " ".repeat(gutterWidth);

	const renderLine = (n: number) =>
		`${String(n).padStart(gutterWidth)} | ${lines[n - 1]}`;

	const contextBefore: string[] = [];
	for (let n = firstLine; n < line; n++) contextBefore.push(renderLine(n));

	const contextAfter: string[] = [];
	for (let n = line + 1; n <= lastLine; n++) contextAfter.push(renderLine(n));

	// Indent the caret with the offending line's own leading characters, tabs
	// included: a tab is one column to the parser but renders as several, so
	// padding with plain spaces drifts left of the error on tab-indented
	// source. `padEnd` covers a column past the end of the line (an error at
	// EOF), where there's nothing left to copy from.
	const caretPad = lines[line - 1]
		.slice(0, column - 1)
		.replace(/[^\t]/g, " ")
		.padEnd(column - 1);

	return [
		`${gutter} ,-[${filePath}:${line}:${column}]`,
		...contextBefore,
		renderLine(line),
		`${gutter} : ${caretPad}^`,
		...contextAfter,
		`${gutter} \`----`,
	].join("\n");
}
