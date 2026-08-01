import { useState } from "react";

const Basic = () => {
	const [count, setCount] = useState(0);

	const increment = () => {
		return setCount(count + 1);
	};

	return (
		<div>
			<p>Count is {count}</p>
			<button onClick={increment}>Increment</button>
		</div>
	);
};

export default Basic;
