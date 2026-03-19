/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src-ui/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg0: '#07101d',
        bg1: '#0c1628',
        accent: '#6e7bff',
        accent2: '#3a6cff',
        muted: 'rgba(221,231,255,0.62)',
        card: 'rgba(188,207,255,0.05)',
        'card-dark': 'rgba(3,7,18,0.30)',
        'border-subtle': 'rgba(255,255,255,0.10)',
      },
      fontFamily: {
        sans: [
          'Aptos',
          'Segoe UI Variable Text',
          'PingFang SC',
          'Hiragino Sans GB',
          'Noto Sans SC',
          'Microsoft YaHei UI',
          'sans-serif',
        ],
        serif: [
          'Aptos Display',
          'Segoe UI Variable Display',
          'PingFang SC',
          'Hiragino Sans GB',
          'Noto Sans SC',
          'Microsoft YaHei UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
