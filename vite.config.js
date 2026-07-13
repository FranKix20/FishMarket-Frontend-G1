import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/chat/health': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chat\/health/, '/health'),
        headers: {
          'x-api-key': 'mk-chatbot-abc123xyz'
        }
      },
      '/api/chat': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chat/, '/chat'),
        headers: {
          'x-api-key': 'mk-chatbot-abc123xyz'
        }
      },
      '/api': {
        target: 'https://bff-mock-g1.vercel.app',
        changeOrigin: true
      }
    }
  }
});

