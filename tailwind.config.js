/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt: '#0a0f0d',
        surface: '#111a14',
        panel: '#182b1e',
        gold: '#c9a84c',
        success: '#2ecc71',
        danger: '#e74c3c',
        ink: '#e8e8e8',
        muted: '#89a28f',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(201, 168, 76, 0.18), 0 20px 80px rgba(0, 0, 0, 0.35)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseAlert: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.85' },
        },
        chipRise: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        flipIn: {
          '0%': { transform: 'rotateY(180deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 240ms ease-out',
        pulseAlert: 'pulseAlert 1.8s ease-in-out infinite',
        chipRise: 'chipRise 360ms ease-out',
        flipIn: 'flipIn 420ms ease-out',
      },
      backgroundImage: {
        table: 'radial-gradient(circle at top, rgba(46, 204, 113, 0.08), transparent 32%), linear-gradient(160deg, rgba(201, 168, 76, 0.05), transparent 28%), linear-gradient(180deg, #0a0f0d 0%, #09130f 45%, #050806 100%)',
      },
    },
  },
  plugins: [],
};