export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  isEraser: boolean;
}

export interface DrawingFragment {
  id: string; // unique ID
  frameNumber: number;
  author: string;
  timestamp: number;
  strokes: Stroke[];
  width: number; // canvas width at time of drawing (for scaling if needed later)
  height: number;
}

const STORAGE_KEY = 'public_line_fragments';

export const Storage = {
  saveFragment: (fragment: DrawingFragment) => {
    try {
      const existing = Storage.getAllFragments();
      // We only allow one drawing per frame for simplicity in this demo, 
      // but in a real app we might stack them. 
      // Here, we'll append it.
      existing.push(fragment);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.error("Failed to save drawing", e);
    }
  },

  getAllFragments: (): DrawingFragment[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load drawings", e);
      return [];
    }
  },

  // Helper to organize fragments by frame number for O(1) lookup during animation
  getFragmentsByFrame: (): Record<number, DrawingFragment[]> => {
    const all = Storage.getAllFragments();
    const map: Record<number, DrawingFragment[]> = {};
    
    all.forEach(frag => {
      if (!map[frag.frameNumber]) {
        map[frag.frameNumber] = [];
      }
      map[frag.frameNumber].push(frag);
    });
    
    return map;
  }
};