import { useState } from "react";

// Inlined from ./Imported: @rspress/plugin-playground compiles a demo as one
// standalone file, so a local sibling import can't resolve.
const Imported = (props: { count: number }) => {
	return <p>Count is {props.count}</p>;
};

const MultiFile = () => {
	const [count, setCount] = useState(0);

	return (
		<div>
			<Imported count={count} />
			<br />
			<br />
			<button onClick={() => setCount(count + 3)}>Increment</button>
		</div>
	);
};

export default MultiFile;
