import "./global.css";
import type { PlaygroundProps } from "@shared/types";
import { FilesProvider } from "../../../context/Files";
import { ResizablePanels } from "../ResizablePanels/ResizablePanels";
import styles from "./Playground.module.css";

type PlaygroundStringifiedProps = {
	[Key in keyof PlaygroundProps]: string;
};

export const Playground = (props: PlaygroundStringifiedProps) => {
	const parsedProps = parseProps(props);

	return (
		<FilesProvider initialValue={parsedProps}>
			<div className={styles.wrapper}>
				<ResizablePanels />
			</div>
		</FilesProvider>
	);
};

/**
 * Parse props, as they come JSON.stringified.
 * Without stringification having code strings (props.files) in MDX tends to break things.
 */
function parseProps(props: PlaygroundStringifiedProps): PlaygroundProps {
	return Object.fromEntries(
		Object.entries(props).map(([key, value]) => {
			return [key, JSON.parse(value)];
		}),
	) as PlaygroundProps;
}
