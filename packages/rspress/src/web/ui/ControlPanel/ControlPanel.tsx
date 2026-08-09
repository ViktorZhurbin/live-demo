import { useElementSize } from "@mantine/hooks";
import { useLiveDemoContext } from "~web/context/LiveDemoProvider";
import { useLocalStorageView } from "~web/hooks/useLocalStorage";

import { ButtonFullscreen } from "./ButtonFullscreen";
import { ButtonWrapCode } from "./ButtonWrapCode";
import { getPanelViewsValues } from "./labels";
import { ToggleButtonGroup } from "./ToggleButtonGroup";

import styles from "./ControlPanel.module.css";

const NARROW_THRESHOLD = 340;

export const ControlPanel = () => {
	const { options, initialWidth } = useLiveDemoContext();
	const wrapperEl = useElementSize();

	// See `ResizablePanels.tsx`'s identical comment: `useElementSize` starts at
	// `width: 0` for one frame, which would otherwise always render icon-only
	// buttons on first paint. `initialWidth` (the skeleton's pre-measured
	// width, from context) covers that frame.
	const width = wrapperEl.width > 0 ? wrapperEl.width : (initialWidth ?? 0);
	const isNarrow = width < NARROW_THRESHOLD;

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
					setValue={setPanelsView}
				/>
			</div>

			<div className={styles.section}>
				<ButtonWrapCode />
				<ButtonFullscreen />
			</div>
		</div>
	);
};
