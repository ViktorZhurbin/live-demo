/**
 * Emits a `console.warn` the first time a given `key` is seen and silently
 * no-ops after that, for the module's lifetime (one dev-server or build
 * process). Used by `remarkPlugin.ts` so re-transforming the same MDX file
 * on every unrelated dev-server edit doesn't re-spam a deprecation notice.
 */
const warnedKeys = new Set<string>();

export const warnOnce = (key: string, message: string) => {
	if (warnedKeys.has(key)) return;

	warnedKeys.add(key);
	console.warn(message);
};

/** Test-only: clears state so cases don't leak into each other. */
export const resetWarnOnce = () => warnedKeys.clear();
