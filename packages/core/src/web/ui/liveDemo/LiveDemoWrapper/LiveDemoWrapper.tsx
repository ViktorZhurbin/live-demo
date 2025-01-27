import "./colors.css";
import clsx from "clsx";
import { useLiveDemoContext } from "web/context";
import styles from "./LiveDemoWrapper.module.css";

type LiveDemoWrapperProps = {
  className?: string;
  children: React.ReactNode;
};

export const LiveDemoWrapper = (props: LiveDemoWrapperProps) => {
  const { fullscreen } = useLiveDemoContext();

  return (
    <div ref={fullscreen.ref} className={clsx(styles.wrapper, props.className)}>
      {props.children}
    </div>
  );
};
