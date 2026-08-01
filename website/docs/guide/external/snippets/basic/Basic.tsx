import { Button } from "@live-demo/rspress/web";
import { useState } from "react";

export const Basic = () => {
	const [count, setCount] = useState(0);

	const increment = () => {
		return setCount(count + 1);
	};

	return (
		<div>
			<p>Count is {count}</p>
			<Button onClick={increment}>Increment</Button>
		</div>
	);
};
