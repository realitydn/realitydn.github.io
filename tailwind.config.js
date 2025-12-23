/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", 
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FFFBF1',
        ink: '#0D0906',
        // Official accent colors
        red: '#E72D33',
        orange: '#FD9D32',
        yellow: '#FFE527',
        green: '#00AB4D',
        teal: '#00AB8D',
        blue: '#0077A3',
        purple: '#403785',
        magenta: '#A93397',
        pink: '#E92775',
      },
      fontFamily: {
        title: ['Montserrat', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Space Grotesk', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      aspectRatio: {
        '4/5': '4 / 5',
      },
      boxShadow: {
        'sm': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'md': '0 8px 24px rgba(0, 0, 0, 0.15)',
        'lg': '0 16px 40px rgba(0, 0, 0, 0.2)',
        'xl': '0 24px 56px rgba(0, 0, 0, 0.25)',
      },
      borderRadius: {
        'none': '0',
      },
      maxWidth: {
        '7xl': '80rem',
      },
    },
  },
  plugins: [],
};
