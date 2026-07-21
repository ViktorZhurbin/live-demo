import { useLiveDemoContext } from "~web/context/LiveDemoProvider";

import { Button } from "../Button/Button";

import styles from "./FileTabs.module.css";

export const FileTabs = () => {
	const { files, activeFile, setActiveFile, options } = useLiveDemoContext();
	const { hide, hideSingleTab } = options?.fileTabs ?? {};
	const fileNames = Object.keys(files);

	if (hide || (hideSingleTab && fileNames.length === 1)) {
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
