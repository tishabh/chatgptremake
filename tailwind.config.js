/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chatgpt: {
          main: '#212121',
          sidebar: '#171717',
          sidebarHover: '#212121',
          input: '#2f2f2f',
          border: '#303030',
          hover: '#2f2f2f',
          userBubble: '#2f2f2f',
          textSecondary: '#b4b4b4',
          accent: '#10a37f', // iconic OpenAI teal/green
        },
        light: {
          main: '#ffffff',
          sidebar: '#f9f9f9',
          sidebarHover: '#ececec',
          input: '#f4f4f4',
          border: '#e5e5e5',
          hover: '#f0f0f0',
          userBubble: '#f4f4f4',
          textSecondary: '#676767',
        }
      },
      fontFamily: {
        sans: [
          'Söhne',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Ubuntu',
          'Cantarell',
          'Noto Sans',
          'sans-serif',
          'Helvetica Neue',
          'Arial'
        ]
      }
    },
  },
  plugins: [],
}
