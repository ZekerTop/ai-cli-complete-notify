/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src-ui/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg0: 'var(--bg0)',
        bg1: 'var(--bg1)',
        accent: '#6e7bff',
        accent2: '#3a6cff',
        muted: 'var(--muted)',
        card: 'var(--surface)',
        'card-dark': 'var(--surface-ink)',
        'border-subtle': 'var(--border)',
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
