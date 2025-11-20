
import React, { useState, useEffect, useRef } from 'react';
import { AnimationCanvas } from './components/AnimationCanvas';
import { DrawingOverlay } from './components/DrawingOverlay';
import { IntroScreen } from './components/IntroScreen';
import { Play, Pause, Info, X, PenTool, Loader2 } from 'lucide-react';
import { Storage, DrawingFragment, Stroke } from './utils/storage';

type AppMode = 'VIEWING' | 'DRAWING' | 'SUBMITTING';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false); // Intro state
  const [mode, setMode] = useState<AppMode>('VIEWING');
  const [isPlaying, setIsPlaying] = useState(false); 
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  
  // Frame Logic
  const [currentTime, setCurrentTime] = useState(0);
  const [frozenTime, setFrozenTime] = useState<number | null>(null);
  
  // Data
  const [drawings, setDrawings] = useState<Record<number, DrawingFragment[]>>({});

  // Dimensions
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight
            });
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    
    const loadedDrawings = Storage.getFragmentsByFrame();
    setDrawings(loadedDrawings);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handlers
  const handleStartExperience = () => {
    // Update State to Reveal UI
    setHasStarted(true);
    setIsPlaying(true);
  };

  const getFrameNumber = (time: number) => Math.floor(time / 100) + 1;

  const handleCatchFrame = () => {
    setIsPlaying(false);
    setFrozenTime(currentTime);
    setMode('DRAWING');
  };

  const handleCancelDrawing = () => {
    setMode('VIEWING');
    setFrozenTime(null);
    setIsPlaying(true);
  };

  const handleSubmitDrawing = (strokes: Stroke[], author: string) => {
    if (frozenTime === null) return;
    
    setMode('SUBMITTING');
    
    const frameNum = getFrameNumber(frozenTime);
    
    // Sanitize strokes to ensure no cyclic references (like DOM events) are passed to storage
    const sanitizedStrokes: Stroke[] = strokes.map(s => ({
        points: s.points.map(p => ({ x: p.x, y: p.y })), // Re-create simple objects
        color: s.color,
        width: s.width,
        isEraser: s.isEraser
    }));
    
    const newFragment: DrawingFragment = {
        id: crypto.randomUUID(),
        frameNumber: frameNum,
        author: author,
        timestamp: Date.now(),
        strokes: sanitizedStrokes,
        width: dimensions.width,
        height: dimensions.height
    };

    Storage.saveFragment(newFragment);
    setDrawings(Storage.getFragmentsByFrame());

    setTimeout(() => {
      setMode('VIEWING');
      setFrozenTime(null);
      setIsPlaying(true);
    }, 1000);
  };

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-white overflow-hidden font-sans text-slate-900 select-none">
      
      {/* Intro Screen - Blocks interaction until start */}
      {!hasStarted && <IntroScreen onStart={handleStartExperience} />}

      {/* Main Canvas - Always renders in background (blurred if intro) */}
      <div className={`absolute inset-0 z-0 transition-all duration-1000 ${!hasStarted ? 'blur-sm scale-105 opacity-50' : 'blur-0 scale-100 opacity-100'}`}>
        {/* 
          Key prop forces remount on start. 
          This ensures the animation timer resets to 0 when you click 'Enter'.
        */}
        <AnimationCanvas 
            key={hasStarted ? 'active-session' : 'intro-session'}
            isPlaying={hasStarted ? isPlaying : true} 
            staticTime={frozenTime}
            onTimeUpdate={(t) => setCurrentTime(t)}
            drawings={drawings}
        />
      </div>

      {/* UI LAYERS - Only visible after start */}
      {hasStarted && (
        <>
          {/* Drawing Overlay */}
          {mode === 'DRAWING' && (
            <DrawingOverlay 
                width={dimensions.width}
                height={dimensions.height}
                frameNumber={frozenTime ? getFrameNumber(frozenTime) : 0}
                onCancel={handleCancelDrawing}
                onSubmit={handleSubmitDrawing}
            />
          )}

          {/* VIEWING MODE UI */}
          {mode === 'VIEWING' && (
            <>
              {/* Title */}
              <div className="absolute top-6 left-6 z-10 mix-blend-multiply max-w-xs sm:max-w-md pointer-events-none animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="pointer-events-auto">
                  <h1 className="text-3xl font-bold tracking-tighter text-black">The Public Line</h1>
                  <p className="text-sm font-medium leading-snug text-slate-600 mt-3 hidden sm:block">
                    Pick a frame and draw around the line. Respond to it, echo it, interrupt it, or reinvent it.
                  </p>
                </div>
              </div>

              {/* Info Button */}
              <div className="absolute top-6 right-6 z-20 animate-in fade-in slide-in-from-top-4 duration-700">
                <button
                  onClick={() => setIsInfoOpen(true)}
                  className="p-3 rounded-full bg-white hover:bg-slate-50 text-slate-900 transition-all shadow-sm border border-slate-100 hover:border-slate-300"
                  aria-label="Project Info"
                >
                  <Info size={24} strokeWidth={1.5} />
                </button>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-12 left-0 right-0 z-20 flex flex-row items-center justify-center gap-4 pointer-events-none px-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                
                {/* Catch Frame */}
                <button
                    onClick={handleCatchFrame}
                    className="pointer-events-auto group relative flex items-center gap-3 bg-black text-white pl-6 pr-8 py-3 rounded-2xl shadow-2xl hover:scale-105 hover:shadow-black/20 active:scale-95 transition-all duration-300"
                >
                    <div className="p-2 bg-white/20 rounded-lg">
                        <PenTool size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                        <div className="text-xs font-medium text-white/60 uppercase tracking-wider">Collaborate</div>
                        <div className="text-lg font-bold">Catch a Frame</div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="pointer-events-auto flex items-center justify-center w-14 h-14 rounded-full bg-white text-black hover:bg-slate-100 border border-slate-200 shadow-xl transition-transform hover:scale-110 active:scale-90"
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>
              </div>
            </>
          )}

          {/* SUBMITTING STATE */}
          {mode === 'SUBMITTING' && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                <Loader2 className="w-12 h-12 text-black animate-spin mb-4" />
                <h2 className="text-xl font-bold text-slate-900">Adding your fragment...</h2>
                <p className="text-slate-500">The public line is evolving.</p>
            </div>
          )}

          {/* INFO MODAL */}
          {isInfoOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm p-6 animate-in fade-in duration-200">
              <div className="relative max-w-lg w-full bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] p-8 md:p-12 border border-slate-100">
                <button 
                  onClick={() => setIsInfoOpen(false)}
                  className="absolute top-6 right-6 p-2 text-slate-400 hover:text-black transition-colors"
                >
                  <X size={24} />
                </button>
                
                <h2 className="text-2xl font-bold tracking-tight mb-6">The Public Line</h2>
                
                <div className="space-y-6 text-lg leading-relaxed font-light text-slate-800">
                  <p>The project consists of 600 frames, animated at 10 frames per second.</p>
                  <p>In each frame, a single abstract line shifts its form. When all frames are complete, they are assembled into a 1-minute film:</p>
                  <p className="font-medium text-black text-xl italic">a public artwork made collectively by the people around us.</p>
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-sm text-slate-500">How to participate: Wait for a shape that speaks to you, click "Catch a Frame", and draw your addition.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
