import { IconMaximize, IconMinimize } from "@tabler/icons-react";
import { Button } from "../../components";
import type { LiveDemoControlPanelProps } from "./types";

type ButtonFullscreenProps = Pick<LiveDemoControlPanelProps, "fullscreen">;

export const ButtonFullscreen = (props: ButtonFullscreenProps) => {
  const { fullscreen } = props;

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
