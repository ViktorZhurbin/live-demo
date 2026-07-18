import { LiveDemoError } from "~shared/errors";
import type { LiveDemoPropsFromPlugin } from "~shared/types";
import type { LiveDemoStringifiedProps } from "~web/types";

/**
 * Parse props, as they come JSON.stringified.
 * Without stringification having code strings (props.files) in MDX tends to break things.
 */
export function parseProps(
	props: LiveDemoStringifiedProps,
): LiveDemoPropsFromPlugin {
	return Object.fromEntries(
		Object.entries(props).map(([key, value]) => {
			try {
				return [key, JSON.parse(value)];
			} catch (cause) {
				// The plugin JSON.stringifies these props at build time, so a parse
				// failure means the two sides are out of sync — surface which prop
				// broke rather than letting a raw SyntaxError bubble up.
				throw new LiveDemoError("PROP_PARSE_FAILED", { key }, { cause });
			}
		}),
	) as LiveDemoPropsFromPlugin;
}
