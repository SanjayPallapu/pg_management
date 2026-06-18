import { useEffect, useRef, useState, useMemo } from "react";
import { Room } from "@/types";
import { Compass } from "lucide-react";
import { gsap } from "gsap";

interface RoomArcHoverPickerProps {
  rooms: Room[];
  onSelectRoom: (roomNo: string) => void;
}

const ITEMS_PER_LAYER = 6;

export const RoomArcHoverPicker = ({ rooms, onSelectRoom }: RoomArcHoverPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extract room numbers and sort them numerically
  const roomNos = useMemo(() => {
    return [...rooms]
      .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }))
      .map((r) => r.roomNo);
  }, [rooms]);

  // Coordinate math for concentric speedometer arcs (sweeping to the left: 120deg to 240deg)
  const getCoords = (index: number, totalCount: number) => {
    const layer = Math.floor(index / ITEMS_PER_LAYER);
    const indexInLayer = index % ITEMS_PER_LAYER;

    const layerStart = layer * ITEMS_PER_LAYER;
    const layerEnd = Math.min(totalCount, layerStart + ITEMS_PER_LAYER);
    const itemsInThisLayer = layerEnd - layerStart;

    // Radial values: inner layer starts at 60px radius, subsequent layers expand by 38px
    const radius = 62 + layer * 38;
    
    // Sweep angles: 120deg (bottom-left) to 240deg (top-left).
    // Outer layers spread slightly wider to prevent overcrowding.
    const startAngle = 125 - layer * 8;
    const endAngle = 235 + layer * 8;

    let angle = startAngle;
    if (itemsInThisLayer > 1) {
      angle = startAngle + (indexInLayer * (endAngle - startAngle)) / (itemsInThisLayer - 1);
    } else {
      angle = (startAngle + endAngle) / 2;
    }

    const rad = (angle * Math.PI) / 180;
    return {
      x: radius * Math.cos(rad),
      y: radius * Math.sin(rad),
    };
  };

  // Determine maximum radius for the hover shield
  const maxRadius = useMemo(() => {
    const totalLayers = Math.ceil(roomNos.length / ITEMS_PER_LAYER);
    return 62 + (totalLayers - 1) * 38 + 20; // Max radius + padding
  }, [roomNos.length]);

  // Animate bubbles using GSAP on hover state changes
  useEffect(() => {
    const targets = bubbleRefs.current.filter(Boolean);
    if (targets.length === 0) return;

    gsap.killTweensOf(targets);

    if (isHovered) {
      // Position bubbles in the center, then fly out
      targets.forEach((el, index) => {
        if (el) {
          gsap.set(el, { x: 0, y: 0, scale: 0, opacity: 0 });
        }
      });

      // Animate out to arc coordinates
      targets.forEach((el, index) => {
        if (el) {
          const { x, y } = getCoords(index, roomNos.length);
          gsap.to(el, {
            x,
            y,
            scale: 1,
            opacity: 1,
            duration: 0.45,
            delay: (index % ITEMS_PER_LAYER) * 0.025 + Math.floor(index / ITEMS_PER_LAYER) * 0.05,
            ease: "back.out(1.6)",
          });
        }
      });
    } else {
      // Retract back to center
      targets.forEach((el, index) => {
        if (el) {
          gsap.to(el, {
            x: 0,
            y: 0,
            scale: 0,
            opacity: 0,
            duration: 0.25,
            delay: (targets.length - 1 - index) * 0.015,
            ease: "power2.in",
          });
        }
      });
    }
  }, [isHovered, roomNos]);

  // Handle pointer enter/leave with forgiving delay
  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150); // 150ms delay to prevent accidental closes
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (roomNos.length === 0) return null;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative ml-auto flex items-center justify-center z-30"
    >
      {/* Small Square Box Trigger Button */}
      <button
        type="button"
        className="w-8 h-8 rounded-lg border border-primary/30 flex items-center justify-center text-primary bg-primary/5 hover:bg-primary/10 transition-all hover:scale-105 active:scale-95 duration-100 shadow-sm"
        title="Hover to pick room (speedometer dial)"
      >
        <Compass className="h-4 w-4" />
      </button>

      {/* Invisible Hover Shield (Background Area) to keep menu open while moving cursor onto the arc */}
      {isHovered && (
        <div
          className="absolute rounded-full bg-transparent pointer-events-auto z-10"
          style={{
            width: `${maxRadius * 2}px`,
            height: `${maxRadius * 2}px`,
            // Clip path masks only the left half of the circle to avoid blocking elements to the right of the button
            clipPath: "polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      )}

      {/* Absolute Container holding the bubble options */}
      <div className="absolute pointer-events-none z-20" style={{ width: 0, height: 0 }}>
        {roomNos.map((roomNo, index) => (
          <button
            key={roomNo}
            ref={(el) => {
              bubbleRefs.current[index] = el;
            }}
            onClick={() => {
              onSelectRoom(roomNo);
              setIsHovered(false);
            }}
            type="button"
            className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-card border border-primary/30 hover:border-primary text-[10px] font-extrabold text-foreground shadow-md hover:bg-primary hover:text-primary-foreground hover:scale-110 active:scale-90 transition-all cursor-pointer opacity-0 scale-0 select-none ${
              isHovered ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{
              x: 0,
              y: 0,
              willChange: "transform, opacity",
            }}
          >
            {roomNo}
          </button>
        ))}
      </div>
    </div>
  );
};
