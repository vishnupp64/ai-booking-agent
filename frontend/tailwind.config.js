/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'rgba(255, 255, 255, 0.06)',
          border: 'rgba(255, 255, 255, 0.12)',
          hover: 'rgba(255, 255, 255, 0.12)',
          active: 'rgba(255, 255, 255, 0.18)',
          card: 'rgba(15, 23, 42, 0.65)',
        },
        accent: {
          primary: '#6366f1', // Indigo
          purple: '#a855f7', // Purple
          cyan: '#06b6d4',   // Cyan
          blue: '#3b82f6',   // Blue
        }
      },
      backdropBlur: {
        xs: '4px',
        glass: '24px',
      },
      boxShadow: {
        'glass-glow': '0 0 25px -5px rgba(99, 102, 241, 0.3)',
        'cyan-glow': '0 0 25px -5px rgba(6, 182, 212, 0.3)',
        'glass-panel': '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 12s ease-in-out infinite',
        'float-reverse': 'float-reverse 15s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(30px, -40px) scale(1.08)' },
        },
        'float-reverse': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(-40px, 30px) scale(0.95)' },
        },
      }
    },
  },
  plugins: [],
}
