
interface Point {
  x: number;
  y: number;
}

/**
 * Generates a smooth SVG path data string connecting the given points.
 * Uses quadratic curves between midpoints to ensure C1 continuity (smooth transitions).
 */
export function getSmoothPath(points: Point[]): string {
  if (points.length < 2) return "";

  // Start at the first point
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  // Loop through points to create quadratic curves
  // We draw from the previous midpoint to the next midpoint, using the actual point as the control point
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    // Midpoint between p0 and p1
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;

    // Quadratic curve to the midpoint
    // Control point is p0 (the current point in the iteration)
    // But wait, the standard smoothing algo:
    // Move to P0.
    // Curve to Mid(P0, P1) ? No.
    
    // Better Algo for open path:
    // M P0
    // Q P1, (P1+P2)/2
    // Q P2, (P2+P3)/2
    // ...
    // T P_Last
    
    d += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }

  // Connect to the last point
  const last = points[points.length - 1];
  d += ` T ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

  return d;
}
