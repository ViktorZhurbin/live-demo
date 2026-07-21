import { useLiveDemoContext } from "~web/context/LiveDemoProvider";

import styles from "./Wrapper.module.css";

type WrapperProps = {
	children: React.ReactNode;
};

export const Wrapper = ({ children }: WrapperProps) => {
	const { fullscreen } = useLiveDemoContext();

	return (
		<div ref={fullscreen.ref} className={styles.wrapper}>
			{children}
		</div>
	);
};
