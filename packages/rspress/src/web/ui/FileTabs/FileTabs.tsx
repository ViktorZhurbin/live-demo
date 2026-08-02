import { useLiveDemoContext } from "~web/context/LiveDemoProvider";

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
					<button
						key={name}
						type="button"
						className={styles.tab}
						data-active={name === activeFile}
						onClick={() => {
							setActiveFile(name);
						}}
					>
						{name}
					</button>
				);
			})}
		</div>
	);
};
