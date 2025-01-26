import { Color3, type CubeTexture, Texture, Vector3 } from "@babylonjs/core";
import { type FC, useCallback, useRef, useState } from "react";
import { assetUrls } from "./constants";

const roughness = 0.0;

export const WithDynamicConfig: FC = () => {
  const [_, setTexturesLoaded] = useState(false);

  const cubeTextureRef = useRef<CubeTexture | undefined>(undefined);
  const cubeTextureCloneRef = useRef<CubeTexture | undefined>(undefined);

  const cubeTextureCallback = useCallback((node: CubeTexture | null) => {
    if (node) {
      cubeTextureRef.current = node;

      cubeTextureCloneRef.current = node.clone();
      cubeTextureCloneRef.current.name = "cloned texture";
      cubeTextureCloneRef.current.coordinatesMode = Texture.SKYBOX_MODE;

      setTexturesLoaded(true); // trigger render and props assignment
    }
  }, []);

  return (
    <>
      <arcRotateCamera
        name="Camera"
        target={Vector3.Zero()}
        alpha={-Math.PI / 4}
        beta={Math.PI / 2.5}
        radius={200}
        minZ={0.1}
      />

      <hemisphericLight
        name="light1"
        intensity={0.7}
        direction={Vector3.Up()}
      />
      <cubeTexture
        ref={cubeTextureCallback}
        name="cubeTexture"
        rootUrl={assetUrls.environment}
        createPolynomials={true}
        format={undefined}
        prefiltered={true}
      />

      <box name="hdrSkyBox" size={1000} infiniteDistance>
        <pbrMaterial
          name="skyBox"
          backFaceCulling={false}
          reflectionTexture={cubeTextureCloneRef.current}
          microSurface={1}
          disableLighting
        />
      </box>

      <sphere
        name="sphereGlass1"
        segments={48}
        diameter={30}
        position={new Vector3(-120, 0, 0)}
      >
        <pbrMaterial
          name="sphereGlass1mat"
          reflectionTexture={cubeTextureRef.current}
          refractionTexture={cubeTextureRef.current}
          linkRefractionWithTransparency
          indexOfRefraction={0.52}
          alpha={0}
          microSurface={1}
          reflectivityColor={new Color3(0.2, 0.2, 0.2)}
          albedoColor={new Color3(0.85, 0.85, 0.85)}
        >
          <pbrClearCoatConfiguration
            assignFrom="clearCoat"
            isEnabled
            roughness={roughness}
          />
        </pbrMaterial>
      </sphere>

      <sphere
        name="sphereMetal"
        segments={48}
        diameter={30}
        position={new Vector3(120, 0, 0)}
      >
        <pbrMaterial
          name="sphereMetalMat"
          reflectionTexture={cubeTextureRef.current}
          microSurface={0.96}
          reflectivityColor={new Color3(0.85, 0.85, 0.85)}
          albedoColor={new Color3(0.01, 0.01, 0.01)}
        >
          <pbrClearCoatConfiguration
            assignFrom="clearCoat"
            isEnabled
            roughness={roughness}
          />
        </pbrMaterial>
      </sphere>

      <sphere
        name="spherePlastic"
        segments={48}
        diameter={30}
        position={new Vector3(0, 0, -120)}
      >
        <pbrMaterial
          name="spherePlasticMat"
          reflectionTexture={cubeTextureRef.current}
          microSurface={0.96}
          albedoColor={new Color3(0.206, 0.94, 1)}
          reflectivityColor={new Color3(0.003, 0.003, 0.003)}
        >
          <pbrClearCoatConfiguration
            assignFrom="clearCoat"
            isEnabled
            roughness={roughness}
          />
        </pbrMaterial>
      </sphere>

      <sphere
        name="sphereGlass2"
        segments={48}
        diameter={30}
        position={new Vector3(0, 0, 120)}
      >
        <pbrMaterial
          name="sphereGlass2mat"
          reflectionTexture={cubeTextureRef.current}
          linkRefractionWithTransparency
          indexOfRefraction={0.52}
          alpha={0}
          microSurface={1}
          reflectivityColor={new Color3(0.2, 0.2, 0.2)}
          albedoColor={new Color3(0.85, 0.85, 0.85)}
        >
          <pbrClearCoatConfiguration
            assignFrom="clearCoat"
            isEnabled
            roughness={roughness}
          />
        </pbrMaterial>
      </sphere>

      <box name="plane" width={65} height={1} depth={65}>
        <pbrMaterial
          name="wood"
          reflectionTexture={cubeTextureRef.current}
          environmentIntensity={1}
          specularIntensity={0.3}
          albedoColor={Color3.White()}
          useMicroSurfaceFromReflectivityMapAlpha
        >
          <texture
            url={assetUrls.reflectivityTexture}
            assignTo="reflectivityTexture"
          />
          <texture url={assetUrls.albedoTexture} assignTo="albedoTexture" />
          <pbrClearCoatConfiguration
            assignFrom="clearCoat"
            isEnabled
            roughness={roughness}
          />
        </pbrMaterial>
      </box>
    </>
  );
};
