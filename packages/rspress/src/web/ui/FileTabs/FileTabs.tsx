import type { FileTabsOptions } from "~shared/types";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";

import { Button } from "../Button/Button";

import styles from "./FileTabs.module.css";

type FileTabsProps = FileTabsOptions;

export const FileTabs = (props: FileTabsProps) => {
	const { files, activeFile, setActiveFile, options } = useLiveDemoContext();
	// Spread, not Object.assign — see the note in Editor.tsx.
	const mergedOptions = { ...options?.fileTabs, ...props };

	const { hideSingleTab } = mergedOptions;
	const fileNames = Object.keys(files);

	if (mergedOptions.hide || (hideSingleTab && fileNames.length === 1)) {
		return null;
	}

	return (
		<div className={styles.wrapper}>
			{fileNames.map((name) => {
				return (
					<Button
						key={name}
						className={styles.tab}
						data-active={name === activeFile}
						onClick={() => {
							setActiveFile(name);
						}}
					>
						{name}
					</Button>
				);
			})}
		</div>
	);
};
