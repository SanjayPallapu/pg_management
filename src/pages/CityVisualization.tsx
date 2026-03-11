import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text, Float } from "@react-three/drei";
import { useRooms } from "@/hooks/useRooms";
import { usePG } from "@/contexts/PGContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building as BuildingIcon, Users, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as THREE from "three";

// ─── Types ──────────────────────────────────────────────────────────────
interface BuildingData {
  roomNo: string;
  floor: number;
  capacity: number;
  occupancy: number;
  rentAmount: number;
  x: number;
  z: number;
}

// ─── Glowing window material ────────────────────────────────────────────
const WindowGrid = ({
  width,
  height,
  occupancy,
  capacity,
}: {
  width: number;
  height: number;
  occupancy: number;
  capacity: number;
}) => {
  const cols = Math.max(2, Math.ceil(width * 3));
  const rows = Math.max(2, Math.ceil(height * 2));
  const windows: JSX.Element[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLit = (r * cols + c) < occupancy || Math.random() < occupancy / Math.max(capacity, 1) * 0.8;
      const wx = (c / (cols - 1) - 0.5) * (width * 0.7);
      const wy = (r / (rows - 1) - 0.5) * (height * 0.7);
      windows.push(
        <mesh key={`${r}-${c}`} position={[wx, wy, 0]}>
          <planeGeometry args={[width * 0.12, height * 0.08]} />
          <meshStandardMaterial
            color={isLit ? "#4fc3f7" : "#1a2332"}
            emissive={isLit ? "#4fc3f7" : "#000000"}
            emissiveIntensity={isLit ? 0.8 + Math.random() * 0.4 : 0}
            transparent
            opacity={isLit ? 0.95 : 0.3}
          />
        </mesh>
      );
    }
  }

  return <group>{windows}</group>;
};

// ─── Single building ────────────────────────────────────────────────────
const CityBuilding = ({ data }: { data: BuildingData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const width = 0.8 + Math.random() * 0.4;
  const depth = 0.8 + Math.random() * 0.4;
  const height = 1.5 + data.capacity * 0.8 + data.floor * 0.5;

  const occupancyRate = data.capacity > 0 ? data.occupancy / data.capacity : 0;
  
  // Color based on occupancy: dark blue (empty) → teal (partial) → cyan (full)
  const buildingColor = useMemo(() => {
    const r = Math.floor(10 + occupancyRate * 20);
    const g = Math.floor(20 + occupancyRate * 50);
    const b = Math.floor(40 + occupancyRate * 80);
    return `rgb(${r}, ${g}, ${b})`;
  }, [occupancyRate]);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.position.y = height / 2 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group position={[data.x, 0, data.z]}>
      {/* Building body */}
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={buildingColor}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Front windows */}
      <group position={[0, height / 2, depth / 2 + 0.01]}>
        <WindowGrid width={width} height={height} occupancy={data.occupancy} capacity={data.capacity} />
      </group>

      {/* Back windows */}
      <group position={[0, height / 2, -(depth / 2 + 0.01)]} rotation={[0, Math.PI, 0]}>
        <WindowGrid width={width} height={height} occupancy={data.occupancy} capacity={data.capacity} />
      </group>

      {/* Side windows */}
      <group position={[width / 2 + 0.01, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <WindowGrid width={depth} height={height} occupancy={data.occupancy} capacity={data.capacity} />
      </group>
      <group position={[-(width / 2 + 0.01), height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <WindowGrid width={depth} height={height} occupancy={data.occupancy} capacity={data.capacity} />
      </group>

      {/* Rooftop glow for full occupancy */}
      {occupancyRate >= 1 && (
        <mesh position={[0, height + 0.1, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial
            color="#00e676"
            emissive="#00e676"
            emissiveIntensity={2}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Room label on hover */}
      {hovered && (
        <Float speed={2} floatIntensity={0.3}>
          <Text
            position={[0, height + 0.5, 0]}
            fontSize={0.3}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {`Room ${data.roomNo}`}
          </Text>
          <Text
            position={[0, height + 0.15, 0]}
            fontSize={0.18}
            color="#4fc3f7"
            anchorX="center"
            anchorY="middle"
          >
            {`${data.occupancy}/${data.capacity} occupied`}
          </Text>
        </Float>
      )}
    </group>
  );
};

// ─── Ground plane ───────────────────────────────────────────────────────
const Ground = ({ size }: { size: number }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
    <planeGeometry args={[size * 3, size * 3]} />
    <meshStandardMaterial color="#0a1628" metalness={0.1} roughness={0.9} />
  </mesh>
);

// ─── Road grid ──────────────────────────────────────────────────────────
const Roads = ({ size }: { size: number }) => {
  const lines: JSX.Element[] = [];
  const count = Math.ceil(size / 3);
  for (let i = -count; i <= count; i++) {
    // Horizontal roads
    lines.push(
      <mesh key={`h-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, i * 3]}>
        <planeGeometry args={[size * 3, 0.3]} />
        <meshStandardMaterial color="#1a2a3a" emissive="#0d1926" emissiveIntensity={0.3} />
      </mesh>
    );
    // Vertical roads
    lines.push(
      <mesh key={`v-${i}`} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[i * 3, 0.005, 0]}>
        <planeGeometry args={[size * 3, 0.3]} />
        <meshStandardMaterial color="#1a2a3a" emissive="#0d1926" emissiveIntensity={0.3} />
      </mesh>
    );
  }
  return <group>{lines}</group>;
};

// ─── Auto-rotate camera ─────────────────────────────────────────────────
const AutoRotate = () => {
  const { camera } = useThree();
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.05;
    const radius = 15;
    camera.position.x = Math.sin(t) * radius;
    camera.position.z = Math.cos(t) * radius;
    camera.lookAt(0, 2, 0);
  });
  return null;
};

// ─── Scene ──────────────────────────────────────────────────────────────
const CityScene = ({ buildings }: { buildings: BuildingData[] }) => {
  const gridSize = Math.ceil(Math.sqrt(buildings.length));

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} color="#1a237e" />
      <directionalLight position={[10, 20, 5]} intensity={0.3} color="#e3f2fd" castShadow />
      <pointLight position={[0, 15, 0]} intensity={0.5} color="#4fc3f7" distance={40} />

      {/* Moon */}
      <mesh position={[15, 18, -20]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="#e8eaf6" emissive="#bbdefb" emissiveIntensity={1.5} />
      </mesh>

      {/* Stars */}
      <Stars radius={100} depth={60} count={3000} factor={4} saturation={0.1} fade speed={0.5} />

      {/* Ground & Roads */}
      <Ground size={gridSize * 2} />
      <Roads size={gridSize * 2} />

      {/* Buildings */}
      {buildings.map((b, i) => (
        <CityBuilding key={i} data={b} />
      ))}

      {/* Controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={40}
        target={[0, 2, 0]}
      />
      <AutoRotate />

      {/* Fog */}
      <fog attach="fog" args={["#050d1a", 15, 50]} />
    </>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────
const CityVisualization = () => {
  const { rooms } = useRooms();
  const { currentPG } = usePG();
  const navigate = useNavigate();

  const buildings: BuildingData[] = useMemo(() => {
    if (!rooms.length) return [];
    const gridCols = Math.ceil(Math.sqrt(rooms.length));
    const spacing = 2.5;

    return rooms.map((room, i) => {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const occupancy = room.tenants?.filter((t) => !t.endDate)?.length ?? 0;

      return {
        roomNo: room.roomNo,
        floor: room.floor || 1,
        capacity: room.capacity,
        occupancy,
        rentAmount: room.rentAmount,
        x: (col - gridCols / 2) * spacing + (Math.random() - 0.5) * 0.5,
        z: (row - gridCols / 2) * spacing + (Math.random() - 0.5) * 0.5,
      };
    });
  }, [rooms]);

  // Stats
  const totalRooms = rooms.length;
  const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
  const totalOccupied = buildings.reduce((s, b) => s + b.occupancy, 0);

  return (
    <div className="relative w-full h-screen bg-[#050d1a] overflow-hidden">
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [12, 10, 12], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor("#050d1a");
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <CityScene buildings={buildings} />
      </Canvas>

      {/* Overlay UI */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between pointer-events-none">
        <div className="pointer-events-auto space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="bg-black/40 backdrop-blur-md text-white hover:bg-black/60 border border-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Title */}
        <div className="text-center flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg tracking-wider">
            {currentPG?.name || "PG"} City
          </h1>
          <p className="text-xs text-cyan-300/70 mt-0.5 tracking-widest uppercase">
            Your properties, visualized
          </p>
        </div>

        <div className="w-20" /> {/* Spacer */}
      </div>

      {/* Stats panel */}
      <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 pointer-events-auto">
        <div className="bg-black/50 backdrop-blur-xl rounded-xl border border-white/10 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-cyan-300 tracking-wider uppercase">City Stats</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <BuildingIcon className="h-5 w-5 mx-auto text-cyan-400 mb-1" />
              <p className="text-lg font-bold text-white">{totalRooms}</p>
              <p className="text-[10px] text-white/50">Buildings</p>
            </div>
            <div className="text-center">
              <Home className="h-5 w-5 mx-auto text-cyan-400 mb-1" />
              <p className="text-lg font-bold text-white">{totalCapacity}</p>
              <p className="text-[10px] text-white/50">Capacity</p>
            </div>
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto text-cyan-400 mb-1" />
              <p className="text-lg font-bold text-white">{totalOccupied}</p>
              <p className="text-[10px] text-white/50">Occupied</p>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
              style={{ width: `${totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-white/40 text-center">
            {totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0}% occupancy • Hover buildings for details
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-16 right-4 pointer-events-none hidden md:block">
        <div className="bg-black/40 backdrop-blur-md rounded-lg border border-white/10 p-3 space-y-2">
          <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">Legend</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-cyan-400 shadow-[0_0_6px_#4fc3f7]" />
            <span className="text-[10px] text-white/70">Lit window = Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#1a2332]" />
            <span className="text-[10px] text-white/70">Dark = Vacant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_6px_#00e676]" />
            <span className="text-[10px] text-white/70">Rooftop = Full</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CityVisualization;
