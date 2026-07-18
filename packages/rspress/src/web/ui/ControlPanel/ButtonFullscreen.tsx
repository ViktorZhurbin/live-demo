import { IconMaximize, IconMinimize } from "@tabler/icons-react";
import { Button } from "~web/components/Button/Button";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";

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
