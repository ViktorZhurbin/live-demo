import clsx from "clsx";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";

import styles from "./Wrapper.module.css";

type WrapperProps = {
	className?: string;
	children: React.ReactNode;
};

export const Wrapper = (props: WrapperProps) => {
	const { fullscreen } = useLiveDemoContext();

	return (
		<div ref={fullscreen.ref} className={clsx(styles.wrapper, props.className)}>
			{props.children}
		</div>
	);
};
