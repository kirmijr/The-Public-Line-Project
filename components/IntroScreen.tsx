
import React from 'react';
import { ArrowRight } from 'lucide-react';

interface IntroScreenProps {
  onStart: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-white/80 backdrop-blur-md animate-in fade-in duration-1000">
      <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-12">
        
        {/* Title Block */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-black">
            The Public Line
          </h1>
          <div className="w-24 h-1 bg-black mx-auto rounded-full" />
        </div>

        {/* Description */}
        <p className="text-xl md:text-2xl font-light leading-relaxed text-slate-700 max-w-lg">
          A collaborative generative experiment.<br/>
          600 frames. One continuous loop.<br/>
          <span className="font-medium text-black">Pick a moment. Leave your mark.</span>
        </p>

        {/* Start Button */}
        <button 
          onClick={onStart}
          className="group relative flex items-center gap-4 px-10 py-5 bg-black text-white rounded-full transition-all hover:scale-105 hover:shadow-2xl active:scale-95"
        >
          <span className="text-lg font-bold tracking-widest uppercase">Enter Experience</span>
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
