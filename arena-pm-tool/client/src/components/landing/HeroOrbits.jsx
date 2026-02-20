/**
 * HeroOrbits — Decorative orbiting dots/rings behind the hero section.
 *
 * Three concentric dashed rings with small dots that orbit at different speeds.
 * Uses CSS keyframe rotations (transform only → GPU-composited).
 * Fully static when prefers-reduced-motion is active (handled via CSS).
 */
export default function HeroOrbits() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <svg
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -top-32 -right-32 w-[500px] h-[500px] lg:w-[600px] lg:h-[600px] opacity-[0.12]"
      >
        {/* Outer ring */}
        <g className="animate-orbit-slow origin-center">
          <circle
            cx="300"
            cy="300"
            r="260"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="8 12"
          />
          <circle cx="300" cy="40" r="4" fill="hsl(var(--primary))" />
        </g>

        {/* Middle ring */}
        <g className="animate-orbit-mid origin-center">
          <circle
            cx="300"
            cy="300"
            r="180"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="6 10"
          />
          <circle cx="300" cy="120" r="3" fill="hsl(var(--primary))" />
          <circle cx="480" cy="300" r="3" fill="hsl(var(--primary))" />
        </g>

        {/* Inner ring */}
        <g className="animate-orbit-fast origin-center">
          <circle
            cx="300"
            cy="300"
            r="100"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <circle cx="300" cy="200" r="2.5" fill="hsl(var(--primary))" />
        </g>
      </svg>
    </div>
  );
}
