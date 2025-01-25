import "./colors.css";
import clsx from "clsx";
import { type Ref, forwardRef } from "react";
import styles from "./PlaygroundWrapper.module.css";

type PlaygroundWrapperProps = {
	className?: string;
	children: React.ReactNode;
};

export const PlaygroundWrapper = forwardRef(
	(props: PlaygroundWrapperProps, ref: Ref<HTMLDivElement>) => {
		return (
			<div ref={ref} className={clsx(styles.wrapper, props.className)}>
				{props.children}
			</div>
		);
	},
);
