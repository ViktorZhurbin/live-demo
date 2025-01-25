import "./colors.css";
import styles from "./PlaygroundWrapper.module.css";

type PlaygroundWrapperProps = {
	children: React.ReactNode;
};

export const PlaygroundWrapper = (props: PlaygroundWrapperProps) => {
	return <div className={styles.wrapper}>{props.children}</div>;
};
