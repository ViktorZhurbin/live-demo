import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useLiveDemoContext } from "web/context";

import { LiveDemoCodeRunner } from "../LiveDemoCodeRunner/LiveDemoCodeRunner";

import styles from "./LiveDemoPreview.module.css";

export const LiveDemoPreview = () => {
	const { files, entryFileName } = useLiveDemoContext();
	const [error, setError] = useState<Error | undefined>();

	const errorOverlay = error ? (
		<pre className={styles.error}>{error?.message}</pre>
	) : null;

	const handleError = (error: unknown) => {
		setError(error instanceof Error ? error : new Error(String(error)));
	};

	return (
		<div className={styles.wrapper}>
			<ErrorBoundary
				onError={handleError}
				resetKeys={[files]}
				fallback={errorOverlay}
			>
				<LiveDemoCodeRunner
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
