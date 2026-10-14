/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './js/**/*.js',
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      colors: {
        // Enhanced cream palette - warmer and softer
        cream: {
          50: '#FEFAF5',
          100: '#F8F1E8',
          200: '#F0E5D4',
          300: '#E8D9C0',
        },
        // Enhanced espresso palette - better contrast levels
        espresso: {
          50: '#F5EFE7',
          100: '#E8DDD0',
          200: '#D4C4B0',
          300: '#B8A488',
          400: '#9C856B',
          500: '#7A634F',
          600: '#5D4A3E',
          700: '#4A3324',
          800: '#3A2819',
          900: '#2A1B10',
          950: '#1B110A',
        },
        // Enhanced sage palette - fresher greens
        sage: {
          50: '#F0F7F0',
          100: '#E0EEE0',
          200: '#C8DEC8',
          300: '#A8C8A8',
          400: '#88B088',
          500: '#5E8754',
          600: '#4A6E42',
          700: '#3A5634',
          800: '#2D4228',
        },
        // Enhanced rust palette - warmer reds
        rust: {
          50: '#FFF0ED',
          100: '#FFE0D8',
          200: '#FFC0B0',
          300: '#FFA088',
          400: '#E07860',
          500: '#B5502D',
          600: '#9C4025',
          700: '#7C331F',
          800: '#5C2A18',
        },
        // Enhanced amber palette - richer golds
        amber: {
          50: '#FFF8E7',
          100: '#FFEFD0',
          200: '#FFE0A8',
          300: '#FFD080',
          400: '#FFC050',
          500: '#E0A94A',
          600: '#CC9636',
          700: '#B07828',
          800: '#905818',
        },
        // New sky blue for information
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
        },
        // New indigo for primary actions
        indigo: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(42,27,16,0.06), 0 6px 16px rgba(42,27,16,0.08)',
        'glow-amber': '0 0 20px rgba(251, 191, 36, 0.3)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.3)',
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.5rem',
      },
      letterSpacing: {
        wider: '0.05em',
        widest: '0.1em',
      },
    },
  },
  plugins: [],
};
