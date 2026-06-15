import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, MeshWobbleMaterial } from "@react-three/drei";
import * as THREE from "three";

/* ───── Floating 3D Building Block ───── */
function BuildingMesh() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.08;
    }
  });

  const windowPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        positions.push([
          -0.18 + col * 0.36,
          0.5 - row * 0.35,
          0.51,
        ]);
      }
    }
    return positions;
  }, []);

  return (
    <group ref={groupRef}>
      {/* Main building */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.9, 1.4, 0.7]} />
        <meshStandardMaterial
          color="#7C85E8"
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1.0, 0.15, 0.8]} />
        <meshStandardMaterial
          color="#5B63D3"
          roughness={0.2}
          metalness={0.2}
        />
      </mesh>

      {/* Windows */}
      {windowPositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.2, 0.18, 0.02]} />
          <meshStandardMaterial
            color="#FDE68A"
            emissive="#F59E0B"
            emissiveIntensity={0.5}
            roughness={0.1}
          />
        </mesh>
      ))}

      {/* Door */}
      <mesh position={[0, -0.45, 0.51]}>
        <boxGeometry args={[0.25, 0.35, 0.02]} />
        <meshStandardMaterial color="#4338CA" roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ───── Floating Particles ───── */
function Particles() {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 30;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 4;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#A78BFA"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

/* ───── Glowing Orb ───── */
function GlowOrb({ position, color, size = 0.15 }: { position: [number, number, number]; color: string; size?: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <MeshDistortMaterial
        color={color}
        roughness={0.1}
        metalness={0.8}
        distort={0.3}
        speed={2}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

/* ───── Main Canvas Component ───── */
interface ThreeDSceneProps {
  className?: string;
  variant?: "building" | "orbs";
}

export function ThreeDScene({ className = "", variant = "building" }: ThreeDSceneProps) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={0.8} color="#E8E0FF" />
        <pointLight position={[-2, 1, 3]} intensity={0.4} color="#7C85E8" />

        {variant === "building" ? (
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <BuildingMesh />
          </Float>
        ) : (
          <>
            <GlowOrb position={[-0.8, 0.5, 0]} color="#7C85E8" size={0.2} />
            <GlowOrb position={[0.7, -0.3, 0.5]} color="#A78BFA" size={0.15} />
            <GlowOrb position={[0.2, 0.8, -0.3]} color="#818CF8" size={0.12} />
          </>
        )}

        <Particles />
      </Canvas>
    </div>
  );
}
