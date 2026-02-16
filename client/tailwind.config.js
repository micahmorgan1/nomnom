/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          50:  '#d6f4dd',
          100: '#aceabc',
          200: '#83df9a',
          300: '#5ad478',
          400: '#34c759',
          500: '#299f46',
          600: '#1f7735',
          700: '#144f23',
          800: '#0a2812',
        },
        danger: {
          50:  '#ffdbd4',
          100: '#ffb6a9',
          200: '#ff927e',
          300: '#ff6d54',
          400: '#ff4b2b',
          500: '#ed2300',
          600: '#b11b00',
          700: '#761200',
          800: '#3b0900',
        },
      },
    },
  },
  plugins: [],
};
