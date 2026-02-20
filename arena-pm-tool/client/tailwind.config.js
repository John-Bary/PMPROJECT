/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Color palette
      colors: {
        neutral: {
          50:  '#fafafa',
          100: '#f5f5f5',
          150: '#ededed',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Status colors — consistent semantic mapping
        success: '#16A34A',
        warning: '#D97706',
        danger:  '#DC2626',
        info:    '#0284C7',
        // Priority colors — maximally distinct hues
        'priority-urgent': '#DC2626',
        'priority-high':   '#EA580C',
        'priority-medium': '#CA8A04',
        'priority-low':    '#2563EB',
        // Status column colors
        'status-todo':        '#6B7280',
        'status-in-progress': '#2563EB',
        'status-completed':   '#16A34A',

        // shadcn/ui CSS variable colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },

      // Border radius - simplified + shadcn variable
      borderRadius: {
        'none': '0',
        'sm': 'calc(var(--radius) - 4px)',
        'DEFAULT': 'calc(var(--radius) - 2px)',
        'md': 'calc(var(--radius))',
        'lg': 'var(--radius)',
        'xl': 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        'full': '9999px',
      },

      // Box shadows
      boxShadow: {
        'none': 'none',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'DEFAULT': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'md': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        'elevated': '0 4px 16px -2px rgba(0,0,0,0.08), 0 2px 6px -1px rgba(0,0,0,0.04)',
        'lg': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        'modal': '0 20px 60px -12px rgba(0,0,0,0.15), 0 8px 20px -6px rgba(0,0,0,0.08)',
        'xl': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        'focus': '0 0 0 3px rgba(79, 70, 229, 0.2)',
      },

      // Typography
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'SF Pro Display',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },

      // Transitions
      transitionDuration: {
        'fast': '150ms',
        'DEFAULT': '200ms',
        'slow': '300ms',
      },

      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },

      // Animation
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'sidebar-expand': 'sidebarExpand 200ms ease-out',
        'sidebar-collapse': 'sidebarCollapse 200ms ease-out',
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Landing page decorative animations
        'orbit-slow': 'orbitSpin 18s linear infinite',
        'orbit-mid': 'orbitSpin 12s linear infinite reverse',
        'orbit-fast': 'orbitSpin 8s linear infinite',
        'float-slow': 'floatY 10s ease-in-out infinite',
        'float-mid': 'floatY 8s ease-in-out infinite reverse',
        'float-fast': 'floatY 6s ease-in-out infinite',
        'shimmer-sweep': 'shimmerSweep 6s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        sidebarExpand: {
          '0%': { width: '64px' },
          '100%': { width: '260px' },
        },
        sidebarCollapse: {
          '0%': { width: '260px' },
          '100%': { width: '64px' },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Landing page decorative keyframes (GPU-friendly: transform/opacity only)
        orbitSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmerSweep: {
          '0%': { transform: 'translateX(-200px)' },
          '100%': { transform: 'translateX(1000px)' },
        },
      },

      // Spacing
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
