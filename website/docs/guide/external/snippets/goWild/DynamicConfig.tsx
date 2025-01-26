import { Engine, Scene } from "react-babylonjs";
import { WithDynamicConfig } from "./WithDynamicConfig";

/**
 * Grabbed from: https://brianzinn.github.io/react-babylonjs/examples/textures/pbr-configuration
 **/
const DynamicConfig = () => {
  return (
    <div style={{ flex: 1, display: "flex" }}>
      <Engine antialias adaptToDeviceRatio canvasId="babylon-js">
        <Scene>
          <WithDynamicConfig />
        </Scene>
      </Engine>
    </div>
  );
};

export default DynamicConfig;
