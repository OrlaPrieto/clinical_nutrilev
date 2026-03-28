/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'nutri-rose': {
          DEFAULT: 'rgb(var(--nutri-rose-rgb) / <alpha-value>)',
          light: 'rgb(var(--nutri-rose-light-rgb) / <alpha-value>)',
          soft: 'rgb(var(--nutri-rose-soft-rgb) / <alpha-value>)',
          extra: 'rgb(var(--nutri-rose-extra-rgb) / <alpha-value>)',
        },
        'nutri-bg': 'rgb(var(--nutri-bg-rgb) / <alpha-value>)',
        'nutri-text': 'rgb(var(--nutri-text-rgb) / <alpha-value>)',
      },
      fontFamily: {
        'serif': ['"Playfair Display"', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'nutri': '0 10px 30px -5px rgb(var(--nutri-rose-rgb) / 0.1), 0 4px 6px -2px rgb(var(--nutri-rose-rgb) / 0.05)',
        'pink-soft': '0 4px 14px 0 rgb(var(--nutri-rose-rgb) / 0.12)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      }
    },
  },
  plugins: [],
}
