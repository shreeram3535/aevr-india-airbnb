/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#008489',
          hover: '#006c70',
        },
        brand: '#ff385c',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
        '3xl': '28px',
      }
    },
  },
  plugins: [],
}
