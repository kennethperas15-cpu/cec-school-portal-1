import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone Student Portal template. Runs independently of the CEC portal app.
//
// Dev serves from "/" so it stays at http://localhost:5180/, while production
// builds against the GitHub Pages sub-path so the template can live alongside
// the CEC portal site at .../cec-school-portal-1/template/.
const PAGES_BASE = '/cec-school-portal-1/template/';

export default defineConfig(({ command, isSsrBuild }) => ({
  base: command === 'build' ? PAGES_BASE : '/',
  plugins: [react()],
  server: { port: 5180, host: '0.0.0.0' },
  build: {
    // Vendor chunking only applies to the browser build; SSR externalises deps.
    rollupOptions: isSsrBuild
      ? {}
      : {
          output: {
            manualChunks: {
              react: ['react', 'react-dom'],
              charts: ['recharts'],
              icons: ['lucide-react'],
            },
          },
        },
  },
}));
