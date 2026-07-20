import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toPayload } from "~shared/errors";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";
import { CodeRunner } from "~web/ui/CodeRunner/CodeRunner";

import styles from "./Preview.module.css";

/**
 * UNEXPECTED means `toPayload` didn't recognize a LiveDemoError — the demo's
 * own runtime error, not ours. Shown raw.
 */
const ErrorContent = ({ error }: { error: Error }) => {
	const payload = toPayload(error);

	if (payload.code === "UNEXPECTED") {
		return error.message;
	}

	return (
		<>
			<strong className={styles.errorTitle}>{payload.title}</strong>
			{payload.message && <div>{payload.message}</div>}
			{payload.notes?.map((note) => (
				<pre key={note} className={styles.errorNote}>
					{note}
				</pre>
			))}
			{payload.hint && (
				<div className={styles.errorHint}>Hint: {payload.hint}</div>
			)}
		</>
	);
};

export const Preview = () => {
	const { files, entryFileName, externalImports } = useLiveDemoContext();
	const [error, setError] = useState<Error | undefined>();

	const errorOverlay = error ? (
		<div className={styles.error}>
			<ErrorContent error={error} />
		</div>
	) : null;

	const handleError = (error: unknown) => {
		setError(error instanceof Error ? error : new Error(String(error)));
	};

	return (
		<div className={styles.wrapper}>
			{/*
			 * `fallback` is null, not `errorOverlay`: `onError` sets the same
			 * `error` state the sibling overlay below already renders from, so
			 * passing it here too paints two stacked copies of it.
			 */}
			<ErrorBoundary onError={handleError} resetKeys={[files]} fallback={null}>
				<CodeRunner
					files={files}
					entryFileName={entryFileName}
					externalImports={externalImports}
					error={error}
					setError={setError}
				/>
			</ErrorBoundary>
			{errorOverlay}
		</div>
	);
};
