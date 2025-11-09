export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#005EB8',
          light: '#E6F0FF'
        },
        sidebar: {
          bg: '#F7F9FC',
          text: '#4B5563'
        },
        risk: {
          low: '#FACC15',
          high: '#E02C2C',
          delabeled: '#22C55E'
        },
        role: {
          recorder: '#E6F0FF',
          consumer: '#E6FFE6'
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
