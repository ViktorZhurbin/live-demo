import type { LiveDemoProps, LiveDemoStringifiedProps } from "shared/types";

/**
 * Parse props, as they come JSON.stringified.
 * Without stringification having code strings (props.files) in MDX tends to break things.
 */
export function parseProps(props: LiveDemoStringifiedProps): LiveDemoProps {
	return Object.fromEntries(
		Object.entries(props).map(([key, value]) => {
			return [key, JSON.parse(value)];
		}),
	) as LiveDemoProps;
}
