/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Warm stone neutrals ──
           Redefining `gray` warms every existing gray-* class across the app
           in one move (cold #f9fafb → warm sand, cold #6b7280 → warm taupe). */
        gray: {
          50:  '#FAF6EF',
          100: '#F3ECE0',
          200: '#E7DCCB',
          300: '#D6C7AF',
          400: '#B3A488',
          500: '#8A7C66',
          600: '#665C49',
          700: '#4A4234',
          800: '#2E2920',
          900: '#1E1A13',
          950: '#141009',
        },

        /* ── Clay / terracotta — primary accent ── */
        primary: {
          50:  '#FBF1EA',
          100: '#F5DECE',
          200: '#EBBC9E',
          300: '#DE9468',
          400: '#CE6E3C',
          500: '#B5471D',
          600: '#9E3C18',
          700: '#7E2F14',
          800: '#5E2410',
          900: '#481D0E',
        },
        clay: {
          50:  '#FBF1EA',
          100: '#F5DECE',
          200: '#EBBC9E',
          300: '#DE9468',
          400: '#CE6E3C',
          500: '#B5471D',
          600: '#9E3C18',
          700: '#7E2F14',
          800: '#5E2410',
          900: '#481D0E',
        },

        /* ── Pine — trust / verified / success ── */
        pine: {
          50:  '#E8F1EB',
          100: '#CADCD0',
          200: '#9BBFA7',
          300: '#6B9C7D',
          400: '#477A5B',
          500: '#2F6B4F',
          600: '#235540',
          700: '#1B4233',
          800: '#143026',
          900: '#0E231C',
        },

        /* ── Honey — ratings / warning ── */
        honey: {
          50:  '#FBF1DC',
          100: '#F6DFAE',
          200: '#EFC56F',
          300: '#E5AE45',
          400: '#E0A93B',
          500: '#D9962B',
          600: '#B97A1C',
          700: '#8E5C15',
        },
      },

      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        arabic: ['IBM Plex Sans Arabic', 'sans-serif'],
      },

      fontSize: {
        'display-sm': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display':    ['3rem',    { lineHeight: '1.05', letterSpacing: '-0.022em' }],
        'display-lg': ['3.75rem', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
      },

      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },

      boxShadow: {
        sm:      '0 1px 2px rgba(46,33,18,0.06)',
        DEFAULT: '0 2px 8px -2px rgba(46,33,18,0.10)',
        md:      '0 6px 18px -4px rgba(46,33,18,0.12)',
        lg:      '0 14px 34px -10px rgba(46,33,18,0.18)',
        xl:      '0 24px 50px -16px rgba(46,33,18,0.22)',
        clay:    '0 10px 24px -8px rgba(181,71,29,0.40)',
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
