/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'nutri-rose': {
          DEFAULT: '#d81b60',
          light: '#ff6b9b',
          soft: '#ffd1dc',
          extra: '#fff0f5',
        },
        'nutri-bg': '#faf9f6',
        'nutri-text': '#1a1a1a',
      },
      fontFamily: {
        'serif': ['"Playfair Display"', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'nutri': '0 10px 30px -5px rgba(216, 27, 96, 0.1), 0 4px 6px -2px rgba(216, 27, 96, 0.05)',
        'pink-soft': '0 4px 14px 0 rgba(216, 27, 96, 0.12)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      }
    },
  },
  plugins: [],
}
