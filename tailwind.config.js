/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
          cyan: '#06b6d4',
          neon: '#00f5ff',
          purple: '#a855f7',
          pink: '#ec4899',
          amber: '#f59e0b',
          emerald: '#10b981',
        },
        dark: {
          950: '#07090e',
          900: '#0b0f19',
          850: '#101524',
          800: '#151c30',
          750: '#1b233d',
          700: '#232d4b',
          600: '#334168',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      spacing: {
        // Used by the navbar (h-18) — not part of Tailwind's default scale.
        18: '4.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out both',
        'bounce-in': 'bounceIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-glow': 'pulseGlow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
        'gradient-x': 'gradientX 15s ease infinite',
        'shimmer': 'shimmer 2.5s infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.94) translateY(12px)' },
          '60%': { opacity: '1', transform: 'scale(1.01) translateY(0)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradientX: {
          '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 80%)',
        'grid-pattern': 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
      }
    },
  },
  plugins: [],
}
