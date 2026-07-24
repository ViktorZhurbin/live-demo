/**
 * Key under which an external demo's collected data is stashed for the
 * remark transform to read back — either a `file="..."` meta value or the
 * deprecated `<code src>`'s `src`. The scan (`visitFilePaths`) and the remark
 * transform (`remarkPlugin`) are separate parses of the same MDX file and
 * can't share node objects, so results cross via a key both sides recompute
 * from inputs they already hold: the MDX file plus the verbatim reference
 * string. That avoids re-running `resolveFileInfo`/`resolvePrefixedPath` in
 * the transform just to look the data up.
 *
 * `\0` can't occur in a filesystem path, so it separates the two parts
 * unambiguously (a plain space could not).
 */
import path from "node:path";

export const demoRefKey = (mdxPath: string, src: string) =>
	`${path.resolve(mdxPath)}\0${src}`;
