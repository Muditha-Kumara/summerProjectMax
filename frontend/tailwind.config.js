/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Elderly-friendly typography scale
      fontSize: {
        'xs': '1rem',     // 16px - minimum for body
        'sm': '1.125rem', // 18px
        'base': '1.25rem', // 20px - default body
        'lg': '1.5rem',   // 24px
        'xl': '1.875rem', // 30px
        '2xl': '2.25rem', // 36px
        '3xl': '3rem',    // 48px
        '4xl': '3.75rem', // 60px - for temperatures
        '5xl': '4.5rem',  // 72px
        '6xl': '6rem',    // 96px
      },
      // High contrast colors
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        warm: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
      // Massive touch targets
      spacing: {
        '18': '4.5rem',
        '20': '5rem',
        '22': '5.5rem',
        '24': '6rem',
        '28': '7rem',
        '32': '8rem',
      },
      minHeight: {
        'touch': '60px',
        'touch-lg': '80px',
        'touch-xl': '100px',
      },
      minWidth: {
        'touch': '60px',
        'touch-lg': '80px',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
}
