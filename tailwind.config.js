/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", 
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: '#fffbf2',
        ink: '#0d0906',
      },
      fontFamily: {
        mont: ['Montserrat', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        space: ['Space Grotesk', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      aspectRatio: {
        '4/5': '4 / 5',
      },
      boxShadow: {
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.4)',
        'event': '0 20px 60px rgba(251, 146, 60, 0.3)',
        'event-hover': '0 30px 70px rgba(251, 146, 60, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backdropBlur: {
        md: '12px',
      },
      maxWidth: {
        '7xl': '80rem',
      },
    },
  },
  plugins: [],
};