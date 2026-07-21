import { IconMaximize, IconMinimize } from "@tabler/icons-react";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";

import { Button } from "../Button/Button";

import styles from "../Button/Button.module.css";

export const ButtonFullscreen = () => {
	const { fullscreen } = useLiveDemoContext();

	const Icon = fullscreen.fullscreen ? IconMinimize : IconMaximize;
	const text = fullscreen.fullscreen ? "Exit fullscreen" : "Fullscreen";

	return (
		<Button title="Toggle fullscreen" onClick={fullscreen.toggle}>
			<Icon />
			<span className={styles.text}>{text}</span>
		</Button>
	);
};
