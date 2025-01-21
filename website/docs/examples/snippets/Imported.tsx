// import { Tag } from "rspress/theme";
import clsx from "clsx";

export const Imported = () => {
	// return <Tag tag="Hello from imported" />;
	return <div className={clsx("tag", "tag--primary")}>Hello from imported</div>;
};
