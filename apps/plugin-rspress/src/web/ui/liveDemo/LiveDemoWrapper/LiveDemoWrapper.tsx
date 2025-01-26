import "./colors.css";
import clsx from "clsx";
import { type Ref, forwardRef } from "react";
import styles from "./LiveDemoWrapper.module.css";

type LiveDemoWrapperProps = {
  className?: string;
  children: React.ReactNode;
};

export const LiveDemoWrapper = forwardRef(
  (props: LiveDemoWrapperProps, ref: Ref<HTMLDivElement>) => {
    return (
      <div ref={ref} className={clsx(styles.wrapper, props.className)}>
        {props.children}
      </div>
    );
  },
);
