import { IconMaximize, IconMinimize } from "@tabler/icons-react";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";

import { Button } from "../../components/Button/Button";

export const ButtonFullscreen = () => {
	const { fullscreen } = useLiveDemoContext();

	const Icon = fullscreen.fullscreen ? IconMinimize : IconMaximize;
	const text = fullscreen.fullscreen ? "Exit fullscreen" : "Fullscreen";

	return (
		<Button
			text={text}
			icon={<Icon />}
			title="Toggle fullscreen"
			onClick={fullscreen.toggle}
		/>
	);
};
