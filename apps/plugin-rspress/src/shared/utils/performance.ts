export const testPerformance = <T extends object>(id: string, fn: () => T) => {
	const start = performance.now();
	const result = fn();
	const end = performance.now();

	const diff = Math.round(end - start);

	console.info(
		`%c${id} in ${diff}ms`,
		"background: #15889f; padding: 6px; color: white;",
	);

	return result;
};
