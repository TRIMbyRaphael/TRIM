/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cloudDancer: '#F5F5F5',
        stretchLimo: '#1A1A1A',
        micron: '#6B6B6B',
        scarletSmile: '#E63946',
      },
    },
  },
  plugins: [],
}
