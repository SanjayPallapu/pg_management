import { useEffect, useRef, useState, useMemo } from "react";
import { Room } from "@/types";
import { X, Search, ChevronUp, ChevronDown, Check, Building } from "lucide-react";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RoomPickerProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  onSelectRoom: (roomNo: string) => void;
}

const ITEM_HEIGHT = 44; // Height of each drum item in pixels
const VISIBLE_RANGE = 2; // Number of items visible above/below the center item

export const RoomPicker = ({ isOpen, onClose, rooms, onSelectRoom }: RoomPickerProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drumContainerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Filtered room numbers, sorted numerically
  const roomNos = useMemo(() => {
    const sorted = [...rooms].sort((a, b) => {
      return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
    });

    if (!searchQuery.trim()) {
      return sorted.map((r) => r.roomNo);
    }

    return sorted
      .filter((r) => r.roomNo.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      .map((r) => r.roomNo);
  }, [rooms, searchQuery]);

  // Keep track of the active animated scroll offset in pixels
  const [scrollOffset, setScrollOffset] = useState(0);
  const offsetRef = useRef(0);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);

  // Initialize/Reset index when room list changes (e.g. after search)
  useEffect(() => {
    setSelectedIndex(0);
    animateToOffset(0);
  }, [roomNos]);

  // Handle open/close animations using GSAP
  useEffect(() => {
    if (isOpen) {
      // Prevent body scrolling
      document.body.style.overflow = "hidden";

      // Reset search
      setSearchQuery("");
      setSelectedIndex(0);
      setScrollOffset(0);
      offsetRef.current = 0;

      // Animate Modal Entrance
      gsap.killTweensOf([overlayRef.current, containerRef.current]);
      
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
      
      gsap.fromTo(
        containerRef.current,
        { scale: 0.9, y: 30, opacity: 0, rotateX: -10 },
        { scale: 1, y: 0, opacity: 1, rotateX: 0, duration: 0.45, ease: "back.out(1.5)" }
      );
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Helper to animate offset using GSAP for custom easing
  const animateToOffset = (targetOffset: number, duration = 0.4) => {
    const obj = { val: offsetRef.current };
    gsap.killTweensOf(obj);
    gsap.to(obj, {
      val: targetOffset,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        offsetRef.current = obj.val;
        setScrollOffset(obj.val);
      },
    });
  };

  const handleClose = () => {
    gsap.to(containerRef.current, {
      scale: 0.9,
      y: 30,
      opacity: 0,
      rotateX: -10,
      duration: 0.3,
      ease: "power2.in",
    });
    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: onClose,
    });
  };

  // Drag handlers for direct drag manipulation
  const handlePointerDown = (e: React.PointerEvent) => {
    if (roomNos.length === 0) return;
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartOffset.current = offsetRef.current;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    gsap.killTweensOf(offsetRef);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = e.clientY - dragStartY.current;
    
    // Custom elastic boundaries (bounce back feel)
    let target = dragStartOffset.current + deltaY;
    const maxOffset = 0;
    const minOffset = -(roomNos.length - 1) * ITEM_HEIGHT;

    if (target > maxOffset) {
      // Resistance above top boundary
      target = maxOffset + (target - maxOffset) * 0.4;
    } else if (target < minOffset) {
      // Resistance below bottom boundary
      target = minOffset + (target - minOffset) * 0.4;
    }

    offsetRef.current = target;
    setScrollOffset(target);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Calculate nearest item index and snap to it
    const maxIndex = roomNos.length - 1;
    let targetIndex = Math.round(-offsetRef.current / ITEM_HEIGHT);
    targetIndex = Math.max(0, Math.min(maxIndex, targetIndex));

    setSelectedIndex(targetIndex);
    animateToOffset(-targetIndex * ITEM_HEIGHT, 0.35);
  };

  // Wheel scrolling handling (mouse / trackpad)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (roomNos.length === 0) return;

    const maxIndex = roomNos.length - 1;
    const direction = e.deltaY > 0 ? 1 : -1;
    let nextIndex = selectedIndex + direction;
    nextIndex = Math.max(0, Math.min(maxIndex, nextIndex));

    if (nextIndex !== selectedIndex) {
      setSelectedIndex(nextIndex);
      animateToOffset(-nextIndex * ITEM_HEIGHT, 0.25);
    }
  };

  // Arrow navigation buttons
  const stepIndex = (direction: number) => {
    if (roomNos.length === 0) return;
    const maxIndex = roomNos.length - 1;
    let nextIndex = selectedIndex + direction;
    nextIndex = Math.max(0, Math.min(maxIndex, nextIndex));

    setSelectedIndex(nextIndex);
    animateToOffset(-nextIndex * ITEM_HEIGHT, 0.35);
  };

  // Direct click on an item in the wheel
  const handleItemClick = (index: number) => {
    setSelectedIndex(index);
    animateToOffset(-index * ITEM_HEIGHT, 0.35);
  };

  const handleConfirm = () => {
    if (roomNos.length > 0) {
      onSelectRoom(roomNos[selectedIndex]);
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={handleClose}
      style={{ perspective: "1000px" }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-card border border-border/80 shadow-2xl p-6 relative flex flex-col space-y-6"
        onClick={(e) => e.stopPropagation()}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Smooth Room Picker</h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type room number to filter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Drum Picker Section */}
        {roomNos.length > 0 ? (
          <div className="relative flex flex-col items-center justify-center py-2 bg-muted/20 border border-border/40 rounded-xl overflow-hidden select-none">
            {/* Control Up Button */}
            <button
              onClick={() => stepIndex(-1)}
              disabled={selectedIndex === 0}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none z-10 transition-colors"
            >
              <ChevronUp className="h-6 w-6" />
            </button>

            {/* Wheel Container */}
            <div
              ref={drumContainerRef}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="h-[180px] w-full relative overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center"
              style={{ touchAction: "none" }}
            >
              {/* Highlight window in the center */}
              <div className="absolute left-4 right-4 h-11 border-y border-primary/30 bg-primary/5 rounded-md pointer-events-none flex items-center justify-between px-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              </div>

              {/* Cylindrical Drum List */}
              <div
                className="absolute w-full"
                style={{
                  height: `${ITEM_HEIGHT}px`,
                  transform: `translateY(${scrollOffset}px)`,
                  willChange: "transform",
                }}
              >
                {roomNos.map((roomNo, idx) => {
                  // Distance calculation for 3D effect
                  // Center position is index * ITEM_HEIGHT. Relative displacement in pixels:
                  const itemY = idx * ITEM_HEIGHT;
                  const currentCenterY = -scrollOffset;
                  const distPx = itemY - currentCenterY;
                  const normDist = distPx / ITEM_HEIGHT;

                  // Only render items that are close to the center for performance
                  if (Math.abs(normDist) > VISIBLE_RANGE + 1) return null;

                  // 3D parameters based on distance
                  const scale = Math.max(0.7, 1.25 - 0.22 * Math.abs(normDist));
                  const opacity = Math.max(0.1, 1 - 0.45 * Math.abs(normDist));
                  const rotateX = normDist * -28; // Rotate in 3D perspective
                  const translateZ = Math.abs(normDist) * -25; // Push back in Z space
                  const isActive = idx === selectedIndex;

                  return (
                    <div
                      key={roomNo}
                      onClick={() => handleItemClick(idx)}
                      className={`absolute left-0 w-full text-center flex items-center justify-center font-bold text-lg transition-colors duration-200 cursor-pointer`}
                      style={{
                        height: `${ITEM_HEIGHT}px`,
                        top: `${itemY}px`,
                        transform: `perspective(500px) rotateX(${rotateX}deg) translateZ(${translateZ}px) scale(${scale})`,
                        opacity,
                        color: isActive ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                        textShadow: isActive ? "0 0 10px rgba(59, 130, 246, 0.3)" : "none",
                        willChange: "transform, opacity",
                      }}
                    >
                      Room {roomNo}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Control Down Button */}
            <button
              onClick={() => stepIndex(1)}
              disabled={selectedIndex === roomNos.length - 1}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none z-10 transition-colors"
            >
              <ChevronDown className="h-6 w-6" />
            </button>
          </div>
        ) : (
          <div className="h-[220px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-muted-foreground/30 rounded-xl">
            <Building className="h-8 w-8 text-muted-foreground/60 mb-2" />
            <p className="text-muted-foreground text-sm">No rooms match your filter.</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={roomNos.length === 0}
            className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-semibold flex items-center gap-1.5 shadow-lg shadow-primary/10"
          >
            <Check className="h-4 w-4" /> Pick Room
          </Button>
        </div>
      </div>
    </div>
  );
};
