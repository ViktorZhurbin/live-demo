import React, { useState } from "react";
// import { Button } from "rspress/theme";
import { Imported } from "./Imported";

const MultiFile = () => {
	const [count, setCount] = useState(0);

	React.useEffect(() => {
		console.log("Testing React. imports", count);
	}, [count]);

	return (
		<div>
			<button type="button" onClick={() => setCount(count + 1)}>
				Increment
			</button>
			<div>Count: {count}</div>
			{/* <Button>Button</Button> */}
			<Imported />
		</div>
	);
};

export default MultiFile;
