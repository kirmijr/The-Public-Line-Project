import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Pencil, Undo, Trash2, Check, X, User } from 'lucide-react';
import { Stroke, Point } from '../utils/storage';

interface DrawingOverlayProps {
  width: number;
  height: number;
  frameNumber: number;
  onCancel: () => void;
  onSubmit: (strokes: Stroke[], author: string) => void;
}

type ToolType = 'pencil' | 'eraser';
type StrokeWidth = 2 | 6 | 12;
type Color = 
  | '#000000' 
  | '#EF4444' 
  | '#F97316' 
  | '#EAB308' 
  | '#22C55E' 
  | '#06B6D4' 
  | '#3B82F6' 
  | '#A855F7' 
  | '#EC4899'; 

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  width,
  height,
  frameNumber,
  onCancel,
  onSubmit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Tool State
  const [tool, setTool] = useState<ToolType>('pencil');
  const [color, setColor] = useState<Color>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<StrokeWidth>(6);

  // Data State (Vector Storage)
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  // Submission State
  const [showNameInput, setShowNameInput] = useState(false);
  const [authorName, setAuthorName] = useState('');

  // Initialize canvas and redraw whenever strokes change (handling undo/clear)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      redraw(ctx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, strokes]); // Re-run if dimensions or strokes change

  const redraw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    strokes.forEach(stroke => {
      if (stroke.points.length < 1) return;
      
      ctx.beginPath();
      ctx.lineWidth = stroke.width;
      
      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const clearCanvas = () => {
    setStrokes([]);
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const point = getPoint(e);
    setCurrentPoints([point]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const point = getPoint(e);
    setCurrentPoints(prev => [...prev, point]);

    // Live render current stroke
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      // Just draw the segment to be fast, full redraw happens on mouse up
      ctx.beginPath();
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
      }
      
      // Draw line from last point
      const lastPoint = currentPoints[currentPoints.length - 1] || point;
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (currentPoints.length > 0) {
        const newStroke: Stroke = {
          points: currentPoints,
          color: color,
          width: strokeWidth,
          isEraser: tool === 'eraser'
        };
        setStrokes(prev => [...prev, newStroke]);
      }
      setCurrentPoints([]);
    }
  };

  const handleInitialSubmit = () => {
    if (strokes.length === 0) return;
    setShowNameInput(true);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(strokes, authorName || 'Anonymous');
  };

  if (showNameInput) {
    return (
      <div className="absolute inset-0 z-40 bg-white/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
        <form onSubmit={handleFinalSubmit} className="w-full max-w-sm bg-white shadow-2xl border border-slate-100 rounded-2xl p-8">
            <div className="flex justify-center mb-6">
                <div className="p-4 bg-slate-50 rounded-full">
                    <User size={32} className="text-slate-900" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-center mb-2">Sign your fragment</h2>
            <p className="text-slate-500 text-center mb-8 text-sm">This will be visible to everyone watching frame #{frameNumber}.</p>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Your Name / Alias</label>
                    <input 
                        type="text" 
                        autoFocus
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="e.g. Picasso, Jane D., Anon"
                        className="w-full text-lg border-b-2 border-slate-200 focus:border-black outline-none py-2 bg-transparent transition-colors placeholder:text-slate-300"
                        maxLength={20}
                    />
                </div>
                
                <div className="flex gap-3 pt-4">
                    <button 
                        type="button"
                        onClick={() => setShowNameInput(false)}
                        className="flex-1 py-3 text-slate-500 font-medium hover:text-black transition-colors"
                    >
                        Back
                    </button>
                    <button 
                        type="submit"
                        className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
                    >
                        Imprint
                    </button>
                </div>
            </div>
        </form>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col">
      {/* Canvas Layer */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="absolute inset-0 touch-none cursor-crosshair"
      />

      {/* Top Bar: Status */}
      <div className="absolute top-6 left-0 right-0 flex justify-center pointer-events-none">
        <div className="bg-black/5 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-mono font-bold text-slate-800 border border-black/10">
           FRAME {frameNumber} / 600
        </div>
      </div>

      {/* Bottom Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white shadow-2xl border border-slate-200 rounded-2xl p-2 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 animate-in slide-in-from-bottom-10 duration-300 w-max max-w-[95vw]">
        
        {/* Tools */}
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl flex-shrink-0">
          <button
            onClick={() => setTool('pencil')}
            className={`p-3 rounded-lg transition-all ${tool === 'pencil' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-3 rounded-lg transition-all ${tool === 'eraser' ? 'bg-white shadow-sm text-black ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Eraser size={20} />
          </button>
        </div>

        <div className="w-px h-8 bg-slate-200 hidden sm:block" />

        {/* Colors (Only if pencil) */}
        <div className={`flex items-center gap-1.5 sm:gap-2 transition-opacity flex-wrap justify-center sm:flex-nowrap max-w-[200px] sm:max-w-none ${tool === 'eraser' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {(['#000000', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#A855F7', '#EC4899'] as Color[]).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'scale-110 border-slate-900' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: c }}
              aria-label={`Select color ${c}`}
            />
          ))}
        </div>

        <div className="w-px h-8 bg-slate-200 hidden sm:block" />

        {/* Sizes */}
        <div className="flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setStrokeWidth(2)} className={`w-2 h-2 rounded-full bg-current transition-colors ${strokeWidth === 2 ? 'text-black' : 'text-slate-300'}`} />
            <button onClick={() => setStrokeWidth(6)} className={`w-3 h-3 rounded-full bg-current transition-colors ${strokeWidth === 6 ? 'text-black' : 'text-slate-300'}`} />
            <button onClick={() => setStrokeWidth(12)} className={`w-4 h-4 rounded-full bg-current transition-colors ${strokeWidth === 12 ? 'text-black' : 'text-slate-300'}`} />
        </div>

        <div className="w-px h-8 bg-slate-200 hidden sm:block" />

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={handleUndo} className="p-2 text-slate-500 hover:text-black" title="Undo">
            <Undo size={20} />
          </button>
          <button onClick={clearCanvas} className="p-2 text-slate-500 hover:text-red-500" title="Clear All">
            <Trash2 size={20} />
          </button>
        </div>
        
        <div className="w-px h-8 bg-slate-200 hidden sm:block" />

        {/* Finish */}
        <div className="flex items-center gap-2 flex-shrink-0">
           <button 
            onClick={onCancel}
            className="p-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-red-600 transition-colors"
          >
            <X size={20} />
          </button>
          <button 
            onClick={handleInitialSubmit}
            className="px-6 py-3 bg-black text-white rounded-xl font-medium text-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <Check size={16} />
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};