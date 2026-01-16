/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // ← ВАЖНО: должен включать все файлы в src
    "./public/index.html", // если используешь классы в HTML
    "../backend/templates/**/*.html", // если Django шаблоны
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}