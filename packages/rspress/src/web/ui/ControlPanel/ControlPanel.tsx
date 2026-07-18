import { useElementSize } from "@mantine/hooks";
import { ToggleButtonGroup } from "~web/components/ToggleButtonGroup/ToggleButtonGroup";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";
import { useLocalStorageView } from "~web/hooks/useLocalStorage";

import { ButtonFullscreen } from "./ButtonFullscreen";
import { ButtonWrapCode } from "./ButtonWrapCode";
import { getPanelViewsValues } from "./labels";

import styles from "./ControlPanel.module.css";

const NARROW_THRESHOLD = 340;

export const ControlPanel = () => {
	const { options } = useLiveDemoContext();
	const wrapperEl = useElementSize();

	const isNarrow = wrapperEl.width < NARROW_THRESHOLD;

	const [panelsView, setPanelsView] = useLocalStorageView();

	if (options?.controlPanel?.hide) {
		return null;
	}

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
					setValue={(value) => setPanelsView(value)}
				/>
			</div>

			<div className={styles.section}>
				<ButtonWrapCode />
				<ButtonFullscreen />
			</div>
		</div>
	);
};
