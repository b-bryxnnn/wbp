// Tailwind config — Royal Gold & Cream theme
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkblue: '#1a1a2e',
        graydark: '#23272f',
        cream: {
          50: '#fffdf7',
          100: '#fef9e7',
          200: '#fdf0c8',
          300: '#fbe4a0',
          400: '#f5d170',
        },
        gold: {
          DEFAULT: '#c8a24e',
          50: '#fef9e7',
          100: '#fdf0c8',
          200: '#f9dc8c',
          300: '#f0c54e',
          400: '#daa520',
          500: '#c8a24e',
          600: '#b8860b',
          700: '#966b0a',
          800: '#7a5508',
          900: '#5c3f06',
        },
        royal: {
          50: '#f8f6f0',
          100: '#ede8d8',
          200: '#ddd4b8',
          300: '#c9b88e',
          400: '#b49a64',
          500: '#9a7d42',
          600: '#7d6434',
          700: '#614d2a',
          800: '#4a3a20',
          900: '#2d2312',
        },
      },
      fontFamily: {
        thai: ['Sarabun', 'Prompt', 'Noto Sans Thai', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 4px 20px rgba(200, 162, 78, 0.3)',
        'gold-lg': '0 8px 40px rgba(200, 162, 78, 0.4)',
        'card': '0 2px 15px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 30px rgba(0,0,0,0.12)',
        'elegant': '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(200,162,78,0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(200, 162, 78, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(200, 162, 78, 0)' },
        },
      },
    },
  },
  plugins: [],
};
