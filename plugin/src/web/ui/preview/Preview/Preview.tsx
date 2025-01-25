import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { usePlaygroundContext } from "web/context";
import { CodeRunner } from "../CodeRunner/CodeRunner";
import styles from "./Preview.module.css";

export const Preview = () => {
	const { files, entryFileName } = usePlaygroundContext();
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
				<CodeRunner
					files={files}
					entryFileName={entryFileName}
					error={error}
					setError={setError}
				/>
			</ErrorBoundary>
			{errorOverlay}
		</div>
	);
};
