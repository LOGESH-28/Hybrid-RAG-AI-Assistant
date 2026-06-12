/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        surface: {
          950: 'var(--bg-primary)',
          900: 'var(--bg-secondary)',
          850: 'var(--bg-secondary)',
          800: 'var(--bg-tertiary)',
          700: 'var(--bg-card)',
          600: 'var(--bg-card-hover)',
          500: '#3e3e56',
          400: '#525272',
        },
        brand: {
          DEFAULT: '#6366f1', // Ultra premium indigo
          light:   '#818cf8',
          dark:    '#4f46e5',
          emerald: '#10b981',
          cyan:    '#06b6d4',
          violet:  '#8b5cf6',
          pink:    '#ec4899',
          glow:    'rgba(99,102,241,0.15)',
        },
        border: 'var(--border-color)',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up':   'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-left': 'slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink':      'blink 1.2s step-start infinite',
        'glow':       'glow 2.5s ease-in-out infinite alternate',
        'shimmer':    'shimmer 1.5s infinite linear',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideLeft: { from: { opacity: 0, transform: 'translateX(-12px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        blink:     { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
        glow:      { from: { boxShadow: '0 0 8px rgba(99,102,241,0.2)' }, to: { boxShadow: '0 0 20px rgba(99,102,241,0.5)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      maxWidth: { chat: '840px' },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover': '0 8px 32px 0 rgba(99, 102, 241, 0.1)',
        'glow-indigo': '0 0 15px rgba(99, 102, 241, 0.25)',
        'glow-emerald': '0 0 15px rgba(16, 185, 129, 0.2)',
      }
    },
  },
  plugins: [],
}
