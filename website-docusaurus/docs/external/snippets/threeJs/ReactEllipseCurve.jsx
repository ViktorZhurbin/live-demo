import { Float, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Atom } from "./Atom";

export default function App() {
  return (
    <Canvas camera={{ position: [0, 0, 10] }}>
      <color attach="background" args={["black"]} />
      <Float speed={4} rotationIntensity={1} floatIntensity={1}>
        <Atom />
      </Float>
      <Stars saturation={0} count={400} speed={0.5} />
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={1} radius={0.7} />
      </EffectComposer>
    </Canvas>
  );
}
