import { useElementSize } from "@mantine/hooks";
import { useLocalStorageView } from "web/hooks/useLocalStorage";
import { ToggleButtonGroup } from "../../components/ToggleButtonGroup/ToggleButtonGroup";
import { ButtonFullscreen } from "./ButtonFullscreen";
import { ButtonWrapCode } from "./ButtonWrapCode";
import styles from "./LiveDemoControlPanel.module.css";
import { getPanelViewsValues } from "./labels";
import type { LiveDemoControlPanelProps } from "./types";

const NARROW_THRESHOLD = 340;

export const LiveDemoControlPanel = ({
  fullscreen,
}: LiveDemoControlPanelProps) => {
  const wrapperEl = useElementSize();

  const isNarrow = wrapperEl.width < NARROW_THRESHOLD;

  const [panelsView, setPanelsView] = useLocalStorageView();

  return (
    <div
      ref={wrapperEl.ref}
      className={styles.wrapper}
      data-icon-buttons={isNarrow}
    >
      <div className={styles.section}>
        <ToggleButtonGroup
          values={getPanelViewsValues(isNarrow)}
          activeValue={panelsView}
          setValue={setPanelsView}
        />
      </div>

      <div className={styles.section}>
        <ButtonWrapCode />
        <ButtonFullscreen fullscreen={fullscreen} />
      </div>
    </div>
  );
};
