import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Text, Float } from "@react-three/drei";
import { useRooms } from "@/hooks/useRooms";
import { usePG } from "@/contexts/PGContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building as BuildingIcon, Users, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as THREE from "three";

// ─── Types ──────────────────────────────────────────────────────────────
interface FloorData {
  roomNo: string;
  capacity: number;
  occupancy: number;
  floor: number;
}

// ─── Window row for a single floor ─────────────────────────────────────
const FloorWindows = ({
  floorY,
  floorHeight,
  buildingWidth,
  buildingDepth,
  occupancy,
  capacity,
}: {
  floorY: number;
  floorHeight: number;
  buildingWidth: number;
  buildingDepth: number;
  occupancy: number;
  capacity: number;
}) => {
  const cols = 4;
  const windowWidth = buildingWidth * 0.15;
  const windowHeight = floorHeight * 0.5;
  const occupancyRate = capacity > 0 ? occupancy / capacity : 0;

  const faces = [
    { pos: [0, 0, buildingDepth / 2 + 0.02] as [number, number, number], rot: [0, 0, 0] as [number, number, number], w: buildingWidth },
    { pos: [0, 0, -(buildingDepth / 2 + 0.02)] as [number, number, number], rot: [0, Math.PI, 0] as [number, number, number], w: buildingWidth },
    { pos: [buildingWidth / 2 + 0.02, 0, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number], w: buildingDepth },
    { pos: [-(buildingWidth / 2 + 0.02), 0, 0] as [number, number, number], rot: [0, -Math.PI / 2, 0] as [number, number, number], w: buildingDepth },
  ];

  return (
    <group position={[0, floorY, 0]}>
      {faces.map((face, fi) => (
        <group key={fi} position={face.pos} rotation={face.rot}>
          {Array.from({ length: cols }).map((_, c) => {
            const isLit = Math.random() < occupancyRate * 0.9 + 0.1;
            const warmth = Math.random();
            const litColor = warmth > 0.5 ? "#ffcc44" : "#4fc3f7";
            const wx = (c / (cols - 1) - 0.5) * (face.w * 0.7);
            return (
              <mesh key={c} position={[wx, 0, 0]}>
                <planeGeometry args={[windowWidth, windowHeight]} />
                <meshStandardMaterial
                  color={isLit ? litColor : "#0a1225"}
                  emissive={isLit ? litColor : "#000000"}
                  emissiveIntensity={isLit ? 1.2 : 0}
                  transparent
                  opacity={isLit ? 0.95 : 0.4}
                />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
};

// ─── Single large building ──────────────────────────────────────────────
const BigBuilding = ({ floors }: { floors: FloorData[] }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hoveredFloor, setHoveredFloor] = useState<number | null>(null);

  const floorHeight = 1.8;
  const buildingWidth = 4;
  const buildingDepth = 3;
  const totalHeight = floors.length * floorHeight;
  const totalOccupancy = floors.reduce((s, f) => s + f.occupancy, 0);
  const totalCapacity = floors.reduce((s, f) => s + f.capacity, 0);
  const occupancyRate = totalCapacity > 0 ? totalOccupancy / totalCapacity : 0;

  // Building base color shifts with occupancy
  const baseColor = useMemo(() => {
    const h = 200 + occupancyRate * 40; // blue to teal
    const s = 30 + occupancyRate * 30;
    const l = 15 + occupancyRate * 10;
    return `hsl(${h}, ${s}%, ${l}%)`;
  }, [occupancyRate]);

  return (
    <group ref={meshRef}>
      {/* Floor segments */}
      {floors.map((floor, i) => {
        const y = i * floorHeight + floorHeight / 2;
        const isHovered = hoveredFloor === i;
        return (
          <group key={i}>
            {/* Floor block */}
            <mesh
              position={[0, y, 0]}
              onPointerEnter={() => setHoveredFloor(i)}
              onPointerLeave={() => setHoveredFloor(null)}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[buildingWidth, floorHeight * 0.95, buildingDepth]} />
              <meshStandardMaterial
                color={isHovered ? "#1a3a5c" : baseColor}
                metalness={0.4}
                roughness={0.6}
              />
            </mesh>

            {/* Floor separator line */}
            {i > 0 && (
              <mesh position={[0, i * floorHeight + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[buildingWidth + 0.1, buildingDepth + 0.1]} />
                <meshStandardMaterial color="#2a4a6a" emissive="#1a3050" emissiveIntensity={0.3} transparent opacity={0.6} />
              </mesh>
            )}

            {/* Windows for this floor */}
            <FloorWindows
              floorY={y}
              floorHeight={floorHeight}
              buildingWidth={buildingWidth}
              buildingDepth={buildingDepth}
              occupancy={floor.occupancy}
              capacity={floor.capacity}
            />

            {/* Hover label */}
            {isHovered && (
              <Float speed={2} floatIntensity={0.2}>
                <Text
                  position={[buildingWidth / 2 + 1.5, y + 0.3, 0]}
                  fontSize={0.3}
                  color="#ffffff"
                  anchorX="left"
                  anchorY="middle"
                  outlineWidth={0.02}
                  outlineColor="#000000"
                >
                  {`Room ${floor.roomNo} (Floor ${floor.floor})`}
                </Text>
                <Text
                  position={[buildingWidth / 2 + 1.5, y - 0.1, 0]}
                  fontSize={0.22}
                  color="#4fc3f7"
                  anchorX="left"
                  anchorY="middle"
                >
                  {`${floor.occupancy}/${floor.capacity} occupied`}
                </Text>
              </Float>
            )}
          </group>
        );
      })}

      {/* Rooftop antenna */}
      <mesh position={[0, totalHeight + 0.8, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.6, 8]} />
        <meshStandardMaterial color="#556677" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Rooftop beacon */}
      <mesh position={[0, totalHeight + 1.7, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial
          color={occupancyRate >= 0.8 ? "#00e676" : "#ff5252"}
          emissive={occupancyRate >= 0.8 ? "#00e676" : "#ff5252"}
          emissiveIntensity={3}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Building name */}
      <Text
        position={[0, totalHeight + 2.3, 0]}
        fontSize={0.4}
        color="#e0f0ff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
        font={undefined}
      >
        PG Tower
      </Text>
    </group>
  );
};

// ─── Ground ─────────────────────────────────────────────────────────────
const Ground = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
    <circleGeometry args={[25, 64]} />
    <meshStandardMaterial color="#070e1a" metalness={0.2} roughness={0.9} />
  </mesh>
);

// ─── Moon ───────────────────────────────────────────────────────────────
const Moon = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = 22 + Math.sin(state.clock.elapsedTime * 0.1) * 0.5;
    }
  });
  return (
    <group>
      <mesh ref={ref} position={[18, 22, -25]}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshStandardMaterial
          color="#e8eaf6"
          emissive="#bbdefb"
          emissiveIntensity={2}
        />
      </mesh>
      {/* Moon glow */}
      <mesh position={[18, 22, -25.5]}>
        <sphereGeometry args={[4.5, 32, 32]} />
        <meshStandardMaterial
          color="#1a237e"
          emissive="#90caf9"
          emissiveIntensity={0.4}
          transparent
          opacity={0.15}
        />
      </mesh>
    </group>
  );
};

// ─── Scene ──────────────────────────────────────────────────────────────
const CityScene = ({ floors }: { floors: FloorData[] }) => (
  <>
    <ambientLight intensity={0.12} color="#1a237e" />
    <directionalLight position={[10, 25, 8]} intensity={0.4} color="#e3f2fd" castShadow />
    <pointLight position={[0, 20, 0]} intensity={0.6} color="#4fc3f7" distance={50} />
    <pointLight position={[-5, 5, 5]} intensity={0.2} color="#ffcc44" distance={20} />

    <Moon />

    <Stars radius={120} depth={80} count={6000} factor={6} saturation={0.2} fade speed={0.3} />

    <Ground />

    <BigBuilding floors={floors} />

    <OrbitControls
      enablePan
      enableZoom
      enableRotate
      minDistance={5}
      maxDistance={50}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, floors.length * 0.9, 0]}
    />

    <fog attach="fog" args={["#050d1a", 25, 70]} />
  </>
);

// ─── Main page ──────────────────────────────────────────────────────────
const CityVisualization = () => {
  const { rooms } = useRooms();
  const { currentPG } = usePG();
  const navigate = useNavigate();

  const floors: FloorData[] = useMemo(() => {
    if (!rooms.length) return [];
    return rooms
      .map((room) => ({
        roomNo: room.roomNo,
        floor: room.floor || 1,
        capacity: room.capacity,
        occupancy: room.tenants?.filter((t) => !t.endDate)?.length ?? 0,
      }))
      .sort((a, b) => a.floor - b.floor || a.roomNo.localeCompare(b.roomNo));
  }, [rooms]);

  const totalRooms = rooms.length;
  const totalCapacity = floors.reduce((s, f) => s + f.capacity, 0);
  const totalOccupied = floors.reduce((s, f) => s + f.occupancy, 0);

  return (
    <div className="relative w-full h-screen bg-[#050d1a] overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [10, 8, 10], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor("#050d1a");
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.5;
        }}
      >
        <CityScene floors={floors} />
      </Canvas>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between pointer-events-none">
        <div className="pointer-events-auto">
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
        <div className="text-center flex-1">
          <h1 className="text-xl font-bold text-white drop-shadow-lg tracking-wider">
            {currentPG?.name || "PG"} Tower
          </h1>
          <p className="text-[10px] text-cyan-300/70 mt-0.5 tracking-widest uppercase">
            Drag to rotate • Scroll to zoom • Click floors for details
          </p>
        </div>
        <div className="w-20" />
      </div>

      {/* Stats panel */}
      <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 pointer-events-auto">
        <div className="bg-black/50 backdrop-blur-xl rounded-xl border border-white/10 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-cyan-300 tracking-wider uppercase">Tower Stats</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <BuildingIcon className="h-5 w-5 mx-auto text-cyan-400 mb-1" />
              <p className="text-lg font-bold text-white">{totalRooms}</p>
              <p className="text-[10px] text-white/50">Floors</p>
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
            {totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0}% occupancy
          </p>
        </div>
      </div>
    </div>
  );
};

export default CityVisualization;
