/**
 * FloatingShapes — Gentle floating geometric accents for the features section.
 *
 * Small circles and rounded rectangles that drift slowly up/down.
 * Uses CSS translate keyframes (GPU-composited, no reflows).
 * Static when prefers-reduced-motion is active (handled via CSS).
 */
export default function FloatingShapes() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Top-left circle */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-12 left-[8%] w-8 h-8 sm:w-10 sm:h-10 opacity-[0.10] animate-float-slow"
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
        />
      </svg>

      {/* Top-right rounded square */}
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute top-20 right-[10%] w-7 h-7 sm:w-9 sm:h-9 opacity-[0.08] animate-float-mid"
      >
        <rect
          x="2"
          y="2"
          width="32"
          height="32"
          rx="8"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
        />
      </svg>

      {/* Bottom-left small dot cluster */}
      <svg
        viewBox="0 0 60 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute bottom-16 left-[12%] w-12 h-4 sm:w-16 sm:h-5 opacity-[0.10] animate-float-fast hidden sm:block"
      >
        <circle cx="6" cy="10" r="2.5" fill="hsl(var(--primary))" />
        <circle cx="22" cy="10" r="2" fill="hsl(var(--primary))" />
        <circle cx="36" cy="10" r="1.5" fill="hsl(var(--primary))" />
        <circle cx="48" cy="10" r="1" fill="hsl(var(--primary))" />
      </svg>

      {/* Bottom-right diamond */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute bottom-24 right-[6%] w-6 h-6 sm:w-8 sm:h-8 opacity-[0.08] animate-float-slow hidden sm:block"
      >
        <rect
          x="4"
          y="4"
          width="24"
          height="24"
          rx="4"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          transform="rotate(45 16 16)"
        />
      </svg>
    </div>
  );
}
