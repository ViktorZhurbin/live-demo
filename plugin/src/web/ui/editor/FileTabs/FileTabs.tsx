import { useFilesContext } from "web/context";
import { Button } from "web/ui/components";
import styles from "./FileTabs.module.css";

export const FileTabs = () => {
	const { files, activeFile, setActiveFile } = useFilesContext();
	const fileNames = Object.keys(files);

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
