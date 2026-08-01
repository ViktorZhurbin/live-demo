import { Float, Sphere, Stars, Trail } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useRef } from "react";
import * as THREE from "three";

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

// Inlined from ./Atom: @rspress/plugin-playground compiles a demo as one
// standalone file, so a local sibling import can't resolve.
function Atom(props) {
	return (
		<group {...props}>
			<Electron position={[0, 0, 0.5]} speed={4} />
			<Electron
				position={[0, 0, 0.5]}
				rotation={[0, 0, Math.PI / 3]}
				speed={5.5}
			/>
			<Electron
				position={[0, 0, 0.5]}
				rotation={[0, 0, -Math.PI / 3]}
				speed={6}
			/>
			<Sphere args={[0.35, 64, 64]}>
				<meshBasicMaterial color={[6, 0.5, 2]} toneMapped={false} />
			</Sphere>
		</group>
	);
}

function Electron({ radius = 2.75, speed = 6, ...props }) {
	const ref = useRef();
	useFrame((state) => {
		const t = state.clock.getElapsedTime() * speed;
		ref.current.position.set(
			Math.sin(t) * radius,
			(Math.cos(t) * radius * Math.atan(t)) / Math.PI / 1.25,
			0,
		);
	});
	return (
		<group {...props}>
			<Trail
				width={4}
				length={10}
				color={new THREE.Color(2, 1, 10)}
				attenuation={(t) => t * t}
			>
				<mesh ref={ref}>
					<sphereGeometry args={[0.25]} />
					<meshBasicMaterial color={[10, 1, 10]} toneMapped={false} />
				</mesh>
			</Trail>
		</group>
	);
}
