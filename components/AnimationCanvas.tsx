import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { SimplexNoise } from '../utils/noise';
import { getSmoothPath } from '../utils/geometry';
import { DrawingFragment } from '../utils/storage';

interface AnimationCanvasProps {
  isPlaying: boolean;
  staticTime?: number | null; 
  onTimeUpdate?: (time: number) => void;
  drawings: Record<number, DrawingFragment[]>; // Map of Frame Number -> Drawings
}

export const AnimationCanvas: React.FC<AnimationCanvasProps> = ({ isPlaying, staticTime, onTimeUpdate, drawings }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [pathData, setPathData] = useState<string>("");
  const [currentFrame, setCurrentFrame] = useState<number>(1);

  // Initialize noise and configuration
  const noiseRef = useRef<SimplexNoise | null>(null);
  
  // Logic configuration
  const FPS = 10;
  const FRAME_INTERVAL = 1000 / FPS;
  const POINT_COUNT = 7;
  const SPATIAL_FREQUENCY = 0.3; 
  
  // Loop Configuration
  const LOOP_MINUTES = 1;
  const LOOP_DURATION_MS = LOOP_MINUTES * 60 * 1000;
  const NOISE_RADIUS = 86; 
  const FIXED_SEED = 12345;

  useEffect(() => {
    noiseRef.current = new SimplexNoise(FIXED_SEED);
  }, []);

  const generatePoints = useCallback((elapsedTime: number, width: number, height: number) => {
    if (!noiseRef.current) return [];

    const points = [];
    const angle = (elapsedTime % LOOP_DURATION_MS) / LOOP_DURATION_MS * Math.PI * 2;
    const timeX = Math.cos(angle) * NOISE_RADIUS;
    const timeY = Math.sin(angle) * NOISE_RADIUS;
    const drawWidth = width;

    for (let i = 0; i < POINT_COUNT; i++) {
      const t = i / (POINT_COUNT - 1);
      const baseX = drawWidth * t;
      const baseY = height / 2;
      const noiseValX = noiseRef.current.noise3D(i * SPATIAL_FREQUENCY, 10 + timeX, 10 + timeY);
      const noiseValY = noiseRef.current.noise3D((i * SPATIAL_FREQUENCY) + 100, 20 + timeX, 20 + timeY);

      let x = baseX;
      if (i !== 0 && i !== POINT_COUNT - 1) {
        x += noiseValX * (width * 0.15); 
      }
      const y = baseY + noiseValY * (height * 0.4);

      points.push({ x, y });
    }
    return points;
  }, [LOOP_DURATION_MS]);

  // Helper to render a specific moment
  const renderFrame = useCallback((time: number) => {
    if (svgRef.current) {
        const { clientWidth, clientHeight } = svgRef.current;
        const points = generatePoints(time, clientWidth, clientHeight);
        const d = getSmoothPath(points);
        setPathData(d);
        
        // Calculate current frame number for external use
        const frame = Math.floor(time / 100) + 1;
        setCurrentFrame(frame);

        if (onTimeUpdate) onTimeUpdate(time);
    }
  }, [generatePoints, onTimeUpdate]);

  // Effect to handle Static Time (Drawing Mode)
  useEffect(() => {
    if (staticTime !== null && staticTime !== undefined) {
        renderFrame(staticTime);
    }
  }, [staticTime, renderFrame]);

  // Animation Loop
  const animate = useCallback((time: number) => {
    if (staticTime !== null && staticTime !== undefined) return;

    if (previousTimeRef.current === null) {
      previousTimeRef.current = time;
    }
    
    if (startTimeRef.current === null) {
        startTimeRef.current = time;
    }

    const deltaTime = time - previousTimeRef.current;

    if (deltaTime >= FRAME_INTERVAL) {
      const animationTime = time - (startTimeRef.current || 0);
      renderFrame(animationTime);
      previousTimeRef.current = time - (deltaTime % FRAME_INTERVAL);
    }

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, FRAME_INTERVAL, renderFrame, staticTime]);

  useEffect(() => {
    if (isPlaying && (staticTime === null || staticTime === undefined)) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      previousTimeRef.current = null; 
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, animate, staticTime]);

  // Get drawings for current frame
  // We only show drawings if they match the current frame ID
  const activeDrawings = useMemo(() => {
    return drawings[currentFrame] || [];
  }, [drawings, currentFrame]);

  return (
    <div className="w-full h-full flex items-center justify-center cursor-crosshair">
      <svg
        ref={svgRef}
        className="w-full h-full block touch-none"
        preserveAspectRatio="none"
        style={{ pointerEvents: 'none' }}
      >
        {/* 1. The Main Generated Line */}
        <path
          d={pathData}
          fill="none"
          stroke="black"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-none"
        />
        
        {/* 2. User Contributions (Rendered as SVG) */}
        {activeDrawings.map((drawing) => (
           <g key={drawing.id}>
             {drawing.strokes.map((stroke, i) => {
                // Convert points array to SVG Path 'd' string
                if (stroke.points.length < 2) return null;
                const d = `M ${stroke.points[0].x} ${stroke.points[0].y} ` + 
                          stroke.points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
                
                // Don't render erase strokes in SVG playback, they just made holes in the canvas during drawing
                // unless we want to support masking. For MVP, we skip 'eraser' strokes in playback
                // or render them white if background is white.
                if (stroke.isEraser) return null; 

                return (
                   <path 
                     key={i}
                     d={d}
                     stroke={stroke.color}
                     strokeWidth={stroke.width}
                     fill="none"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     opacity="0.9"
                   />
                );
             })}
             {/* Optional: Show Author Name briefly or subtly? */}
             {/* For now, let's keep it clean, maybe just tooltips later */}
           </g>
        ))}

        {/* 3. Optional Echo */}
        <path
          d={pathData}
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: 'translate(2px, 2px)' }}
        />
      </svg>
      
      {/* Author Credits Overlay (Transient) */}
      {activeDrawings.length > 0 && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none">
             <div className="flex flex-col items-center gap-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeDrawings.map(d => (
                    <span key={d.id} className="text-[10px] uppercase tracking-widest font-bold text-slate-400 bg-white/80 px-2 py-1 rounded-md shadow-sm backdrop-blur-sm">
                        By {d.author}
                    </span>
                ))}
             </div>
        </div>
      )}
    </div>
  );
};