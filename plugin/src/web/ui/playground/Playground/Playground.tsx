import "./global.css";
import type { PlaygroundStringifiedProps } from "@shared/types";
import { FilesProvider } from "../../../context/Files";
import { ResizablePanels } from "../ResizablePanels/ResizablePanels";
import styles from "./Playground.module.css";
import { parseProps } from "./parseProps";

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
