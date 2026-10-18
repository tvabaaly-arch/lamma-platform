/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        green: { DEFAULT: '#0F3D32', 950: '#082520', 900: '#0B3029', 800: '#0F3D32', 700: '#1A5546', 600: '#2A6B5A', 100: '#DCE6E1', 50: '#EEF3F0' },
        gold: { DEFAULT: '#D4A373', 700: '#B07E4F', 300: '#E6C6A4', 100: '#F5E6D6' },
        cream: { DEFAULT: '#F6EDE7', 50: '#FCF8F5', 100: '#F9F3EE', 200: '#F6EDE7', 300: '#EEDFD4', 400: '#E4CFC0' },
        blush: { DEFAULT: '#E89B9A', 700: '#C9706F', 300: '#F2C3C2', 100: '#FBE7E6' },
        cocoa: { DEFAULT: '#8C5E3C', 700: '#6E4528', 300: '#BE9877' },
        ink: '#17302A',
      },
      fontFamily: {
        display: ['Readex Pro', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        sans: ['IBM Plex Sans Arabic', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,61,50,.04), 0 8px 24px -8px rgba(15,61,50,.12)',
        lift: '0 2px 4px rgba(15,61,50,.04), 0 24px 48px -16px rgba(15,61,50,.22)',
        glow: '0 10px 40px -10px rgba(212,163,115,.6)',
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.75rem' },
    },
  },
  plugins: [],
}
