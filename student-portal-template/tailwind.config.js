/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Playfair Display"', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
      },
      colors: {
        brand: { DEFAULT: '#1E3A8A', deep: '#1B365D', soft: '#3B82F6', ink: '#0F172A' },
        line: '#E2E8F0',
        surface: '#F3F6FC',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15,23,42,0.04), 0 1px 3px 0 rgba(15,23,42,0.06)',
        soft: '0 18px 40px -24px rgba(30,58,138,0.35)',
        navy: '0 20px 45px -20px rgba(27,54,93,0.55)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .3s ease-out both',
        'scale-in': 'scale-in .18s ease-out both',
        'toast-in': 'toast-in .25s ease-out both',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
