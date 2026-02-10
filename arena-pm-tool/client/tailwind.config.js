/** @type {import('tailwindcss').Config} */
module.exports = {
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
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // Semantic colors
        'bg-app':        '#F8F9FC',
        'surface':       '#FFFFFF',
        'border-default':'#E8EBF0',
        'border-subtle': '#F1F3F6',
        // Text semantic
        'text-primary':  '#0F172A',
        'text-secondary':'#64748B',
        'text-tertiary': '#94A3B8',
        // Status colors
        success: '#10B981',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#0EA5E9',
        // Priority colors
        'priority-urgent': '#DC2626',
        'priority-high':   '#EA580C',
        'priority-medium': '#CA8A04',
        'priority-low':    '#2563EB',
      },

      // Border radius - simplified
      borderRadius: {
        'none': '0',
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
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
      },

      // Spacing
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
}
