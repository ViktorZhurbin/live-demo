import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useFilesContext } from "../../../context/Files";
import { CodeRunner } from "../CodeRunner/CodeRunner";
import styles from "./Preview.module.css";

export const Preview = () => {
	const { files } = useFilesContext();
	const [error, setError] = useState<Error | undefined>();

	const errorOverlay = error ? (
		<pre className={styles.error}>{error?.message}</pre>
	) : null;

	return (
		<div className={styles.wrapper}>
			<ErrorBoundary
				onError={setError}
				resetKeys={[files]}
				fallback={errorOverlay}
			>
				<CodeRunner files={files} setError={setError} />
			</ErrorBoundary>
			{errorOverlay}
		</div>
	);
};
