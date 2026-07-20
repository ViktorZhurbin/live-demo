import clsx from "clsx";
import { useEffect, useState } from "react";

export default function WithExternalImports() {
	const [active, setActive] = useState(false);

	useEffect(() => {
		setActive(true);
	}, []);

	return <div className={clsx("box", { active })}>External imports</div>;
}
