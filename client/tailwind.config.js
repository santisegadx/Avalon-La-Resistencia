/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        obsidian: '#0b090e',
        stonecard: '#14111a',
        stoneelev: '#1b1724',
        brass: '#d4a64a',
        parchment: '#f3ebd8',
      },
      boxShadow: {
        torch: '0 0 32px rgba(217, 155, 38, 0.16)',
        goldring: '0 0 18px rgba(212, 166, 74, 0.25)',
        crimsonring: '0 0 18px rgba(225, 29, 72, 0.28)',
        azurering: '0 0 18px rgba(56, 189, 248, 0.24)',
      },
    },
  },
  plugins: [],
};
