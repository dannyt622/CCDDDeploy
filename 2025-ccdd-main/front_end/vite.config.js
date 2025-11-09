import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  base: process.env.NODE_ENV === 'production' ? '/' : '/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/utils/**/*.{js,jsx}',
        'src/services/**/*.{js,jsx}',
        'src/routes/**/*.{js,jsx}',
        'src/components/**/*.{js,jsx}',
        'src/context/**/*.{js,jsx}'
      ],
      exclude: [
        'src/main.jsx',
        'src/App.jsx',
        'src/setupTests.js',
        'src/constants/**',
        'src/styles/**',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
        'src/**/*.test.{js,jsx}',
        'src/**/*.spec.{js,jsx}',
        'tailwind.config.js',
        'postcss.config.js',
        'vite.config.js',
        'node_modules/**',
        'dist/**',
        'docs/**',
        'coverage/**'
      ]
    }
  }
});
