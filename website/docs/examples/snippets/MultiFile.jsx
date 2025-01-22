import clsx from "clsx";
import React, { useState } from "react";
import { Button } from "rspress/theme";
import { Imported } from "./Imported";

export const MultiFile = () => {
	const [count, setCount] = useState(0);

	React.useEffect(() => {
		// 	console.log("Testing React. imports", count);
	}, []);

	return (
		<div>
			<Button text="Increment" onClick={() => setCount(count + 1)} />
			<div className={clsx("button")}>Count: {count}</div>
			<Imported />
		</div>
	);
};
