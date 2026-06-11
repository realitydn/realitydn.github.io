/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Theme surfaces — RGB-triplet vars so alpha utilities work
        // (border-ink/10, bg-ink/90, …) and everything flips Day/Night.
        cream: 'rgb(var(--bg-rgb) / <alpha-value>)',
        ink: 'rgb(var(--fg-rgb) / <alpha-value>)',
        surface: 'var(--surface)',
        // Year 2 palette — 3 majors + 4 minors. LOCKED.
        yellow: 'var(--yellow)',
        red: 'var(--red)',
        blue: 'var(--blue)',
        pink: 'var(--pink)',
        amber: 'var(--amber)',
        green: 'var(--green)',
        purple: 'var(--purple)',
        accent: 'var(--accent)',
        // Warm-ink gray ramp — keeps legacy text-gray-* markup on-system
        // (ink at reduced strength) instead of Tailwind's cool grays.
        gray: {
          50:  'rgb(var(--fg-rgb) / 0.04)',
          100: 'rgb(var(--fg-rgb) / 0.07)',
          200: 'rgb(var(--fg-rgb) / 0.12)',
          300: 'rgb(var(--fg-rgb) / 0.16)',
          400: 'rgb(var(--fg-rgb) / 0.45)',
          500: 'rgb(var(--fg-rgb) / 0.55)',
          600: 'rgb(var(--fg-rgb) / 0.64)',
          700: 'rgb(var(--fg-rgb) / 0.72)',
          800: 'rgb(var(--fg-rgb) / 0.84)',
          900: 'rgb(var(--fg-rgb) / 0.92)',
        },
      },
      fontFamily: {
        title: ['Montserrat', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Space Grotesk', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      aspectRatio: {
        '4/5': '4 / 5',
      },
      // Flat riso down-shadows — straight down, almost no blur.
      boxShadow: {
        'sm': 'var(--sh-light)',
        'md': 'var(--sh-default)',
        'lg': 'var(--sh-heavy)',
        'xl': 'var(--sh-heavy)',
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
