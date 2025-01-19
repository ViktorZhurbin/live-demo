import { useFilesContext } from "../../../context/Files";
import { Button } from "../../components/Button/Button";
import styles from "./FileTabs.module.css";

export const FileTabs = () => {
	const { files, activeFile, setActiveFile } = useFilesContext();
	const fileNames = Object.keys(files);

	if (fileNames.length < 2) return null;

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
