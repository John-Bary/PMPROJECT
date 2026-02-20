/**
 * ShimmerDivider — A subtle horizontal line with a traveling highlight.
 *
 * A thin SVG line with a gradient mask that sweeps left-to-right.
 * Uses CSS translateX animation (GPU-composited).
 * Static when prefers-reduced-motion is active (handled via CSS).
 */
export default function ShimmerDivider() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none w-full flex justify-center py-1"
    >
      <svg
        viewBox="0 0 800 4"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-2xl h-1 overflow-visible"
      >
        <defs>
          {/* Base fade-at-edges gradient */}
          <linearGradient id="shimmer-base" x1="0" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity="0" />
            <stop offset="20%" stopColor="hsl(var(--border))" stopOpacity="1" />
            <stop offset="80%" stopColor="hsl(var(--border))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="0" />
          </linearGradient>

          {/* Traveling highlight */}
          <linearGradient id="shimmer-highlight" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Static base line */}
        <line
          x1="0"
          y1="2"
          x2="800"
          y2="2"
          stroke="url(#shimmer-base)"
          strokeWidth="1"
        />

        {/* Animated highlight sweep */}
        <rect
          x="-200"
          y="0"
          width="200"
          height="4"
          fill="url(#shimmer-highlight)"
          className="animate-shimmer-sweep"
        />
      </svg>
    </div>
  );
}
