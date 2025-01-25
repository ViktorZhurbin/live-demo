import { usePlaygroundContext } from "web/context";
import { Button } from "web/ui/components";
import styles from "./FileTabs.module.css";

type FileTabsProps = {
	hideSingleTab?: boolean;
};

export const FileTabs = (props: FileTabsProps) => {
	const { files, activeFile, setActiveFile } = usePlaygroundContext();
	const fileNames = Object.keys(files);

	if (props.hideSingleTab && fileNames.length === 1) {
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
