import clsx from "clsx";

import styles from "./Button.module.css";

type ButtonProps = React.DetailedHTMLProps<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	HTMLButtonElement
>;

export const Button = ({ children, className, ...restProps }: ButtonProps) => {
	const classes = clsx(className, styles.button);

	return (
		<button className={classes} {...restProps}>
			{children}
		</button>
	);
};
