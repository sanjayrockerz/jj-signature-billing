/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain:    '#F8F3E8',
        cardBg:    '#FFFDF8',
        maroon: {
          DEFAULT: '#CBB89D',
          dark: '#171411',
        },
        textMain:  '#111111',
        textMuted: '#6B7280',
        borderLight: '#D8CBB7',
      },
      fontFamily: {
        sans:      ['Inter', 'sans-serif'],
        headline:  ['Inter', 'sans-serif'],
      },
      // Shared application type scale. Keep page-level typography on these
      // tokens so responsive screens do not drift through one-off pixel sizes.
      fontSize: {
        xs:  ['0.625rem', { lineHeight: '1.35' }],
        sm:  ['0.75rem', { lineHeight: '1.4' }],
        base:['0.875rem', { lineHeight: '1.5' }],
        lg:  ['1rem', { lineHeight: '1.45' }],
        xl:  ['1.125rem', { lineHeight: '1.35' }],
        '2xl': ['1.375rem', { lineHeight: '1.2' }],
        '3xl': ['1.75rem', { lineHeight: '1.15' }],
        '4xl': ['2.25rem', { lineHeight: '1.1' }],
      },
      spacing: {
        control: '0.75rem',
        card: '1rem',
        section: '1.25rem',
      },
      boxShadow: {
        soft:   '0 1px 3px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        'card': '12px',
        'btn': '10px',
        'input': '10px',
        'table': '12px',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'floatDelay': 'float 4s ease-in-out 1.5s infinite',
        'slideUp': 'slideUp 0.6s ease forwards',
        'fadeIn': 'fadeIn 0.5s ease forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
