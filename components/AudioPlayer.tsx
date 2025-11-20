
import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

// Using JSDelivr CDN for reliable Content-Type headers (audio/mpeg) and CORS support.
// This fixes Safari "Not Supported" errors caused by GitHub Raw serving text/plain.
const AUDIO_URL = "https://cdn.jsdelivr.net/gh/kirmijr/Thepublicline@main/1mloop.mp3";

// Singleton Audio Instance
const audio = new Audio();
audio.src = AUDIO_URL;
audio.loop = true;
audio.crossOrigin = "anonymous"; // JSDelivr supports CORS properly

export const startAudio = async () => {
  // iOS Volume Fix: Wrap in try/catch because iOS volume is read-only and throws if you try to set it
  try {
      audio.volume = 0.5;
  } catch (e) {
      // Ignore error on iOS
  }

  try {
    // Standard play attempt
    await audio.play();
    console.log("Audio playback started.");
  } catch (error) {
    console.warn("Standard play failed, attempting Safari reset sequence...", error);
    
    // Safari Rescue Sequence:
    // If the standard play fails with "NotSupported", it often needs a hard .load() 
    // triggered explicitly within the user interaction event.
    try {
        audio.load();
        await audio.play();
        console.log("Audio playback started (after reset).");
    } catch (retryError) {
        console.error("Audio playback completely failed:", retryError);
    }
  }
};

interface AudioPlayerProps {
  isPlaying: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ isPlaying }) => {
  const [isMuted, setIsMuted] = useState(audio.muted);

  // Sync React state with Audio Object
  useEffect(() => {
    if (isPlaying) {
       if (audio.paused && audio.readyState > 0) {
         audio.play().catch(e => console.warn("Sync play blocked", e));
       }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }, [isPlaying]);

  const handleToggleMute = () => {
    const newState = !audio.muted;
    audio.muted = newState;
    setIsMuted(newState);
  };

  return (
    <div className="absolute top-6 right-20 z-20 pointer-events-auto animate-in fade-in duration-700 delay-300">
      <button 
        onClick={handleToggleMute}
        className="p-3 rounded-full bg-white hover:bg-slate-50 text-slate-900 transition-all shadow-sm border border-slate-100 hover:border-slate-300 active:scale-95 flex items-center justify-center"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={24} strokeWidth={1.5} /> : <Volume2 size={24} strokeWidth={1.5} />}
      </button>
    </div>
  );
};
