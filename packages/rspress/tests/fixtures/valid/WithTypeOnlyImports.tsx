import type { ReactNode } from "react";
import { useState, type FC } from "react";

import { SimpleComponent } from "./SimpleComponent";
import type { SimpleComponentProps } from "./SimpleComponentTypes";

export const WithTypeOnlyImports: FC<{ children?: ReactNode }> = () => {
	const [count] = useState<SimpleComponentProps["count"]>(0);

	return (
		<div>
			<SimpleComponent />
			{count}
		</div>
	);
};

export type { SimpleComponentProps } from "./SimpleComponentTypes";
export type * from "./SimpleComponentTypes";
