import { useEffect, useRef } from "react";
import gsap from "gsap";

interface IntroSplashProps {
  onComplete: () => void;
}

export const IntroSplash = ({ onComplete }: { onComplete: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<HTMLDivElement>(null);
  const bgOrbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          // Fade out the entire container before calling onComplete
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.out",
            onComplete: onComplete,
          });
        },
      });

      // 1. Initial State Setup
      gsap.set([iconRef.current, ring1Ref.current, ring2Ref.current], {
        scale: 0,
        opacity: 0,
      });
      gsap.set(bgOrbRef.current, { scale: 0.5, opacity: 0 });
      
      const floatingShapes = shapesRef.current?.children;
      if (floatingShapes) {
        gsap.set(floatingShapes, { opacity: 0, scale: 0 });
      }

      // 2. Animate Background Orb (glowing pulse)
      tl.to(bgOrbRef.current, {
        scale: 1,
        opacity: 1,
        duration: 1.0,
        ease: "power3.out",
      });

      // 3. Animate PG/Room Icon (springy pop in)
      tl.to(
        iconRef.current,
        {
          scale: 1,
          opacity: 1,
          duration: 0.7,
          ease: "back.out(1.8)",
        },
        "-=0.7"
      );

      // 4. Animate Circles/Rings (expanding outwards)
      tl.to(
        ring1Ref.current,
        {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
        },
        "-=0.3"
      ).to(
        ring2Ref.current,
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.4"
      );

      // 5. Burst floating shapes outwards in different angles
      if (floatingShapes && floatingShapes.length > 0) {
        const shapesArr = Array.from(floatingShapes);
        tl.to(
          shapesArr,
          {
            opacity: 0.7,
            scale: 1,
            x: (i) => {
              const angles = [30, 120, 210, 300, 75, 255];
              const angle = (angles[i % angles.length] * Math.PI) / 180;
              return Math.cos(angle) * (70 + i * 8);
            },
            y: (i) => {
              const angles = [30, 120, 210, 300, 75, 255];
              const angle = (angles[i % angles.length] * Math.PI) / 180;
              return Math.sin(angle) * (70 + i * 8);
            },
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.04,
          },
          "-=0.5"
        );
      }

      // 6. Subtle idle floating animations
      gsap.to(iconRef.current, {
        y: -6,
        duration: 1.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(ring2Ref.current, {
        rotation: 360,
        duration: 10,
        repeat: -1,
        ease: "none",
      });
    }, containerRef);

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070913] overflow-hidden select-none"
    >
      {/* Background Glowing Orb */}
      <div
        ref={bgOrbRef}
        className="absolute w-[350px] h-[350px] rounded-full bg-primary/20 blur-[70px] pointer-events-none"
      />
      
      {/* Central Animation Canvas */}
      <div className="relative flex items-center justify-center w-72 h-72">
        
        {/* Inner solid ring */}
        <div
          ref={ring1Ref}
          className="absolute rounded-full border border-primary/25 w-24 h-24 pointer-events-none"
        />
        
        {/* Outer dashed ring */}
        <div
          ref={ring2Ref}
          className="absolute rounded-full border border-dashed border-primary/15 w-40 h-40 pointer-events-none"
        />

        {/* Abstract shapes container (will burst out) */}
        <div ref={shapesRef} className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Dot 1 */}
          <div className="absolute w-2 h-2 bg-blue-400 rounded-full" />
          {/* Cross 1 */}
          <div className="absolute text-indigo-400 text-xs font-bold font-mono">+</div>
          {/* Dot 2 */}
          <div className="absolute w-2.5 h-2.5 bg-purple-400 rounded-full" />
          {/* Cross 2 */}
          <div className="absolute text-sky-400 text-sm font-bold font-mono">×</div>
          {/* Circle outline */}
          <div className="absolute w-3 h-3 rounded-full border border-pink-400" />
          {/* Triangle / abstract shape */}
          <div className="absolute w-2 h-2 bg-teal-400 rotate-45" />
        </div>

        {/* Generic PG/Room Icon in the absolute center */}
        <div
          ref={iconRef}
          className="relative z-10 p-5 bg-slate-900/90 border border-slate-800/90 rounded-2xl shadow-2xl shadow-primary/20 backdrop-blur-md"
        >
          <svg
            className="w-12 h-12 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Abstract building with bed inside (signifying room/PG) */}
            <path d="M3 10a2 2 0 0 1 .707-1.535l7.5-6.5a2 2 0 0 1 2.586 0l7.5 6.5A2 2 0 0 1 21 10v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-9z" />
            <path d="M6 14h6M6 17h12M6 14v3M18 12v5M12 12h6M12 12v2" />
          </svg>
        </div>
      </div>
    </div>
  );
};
