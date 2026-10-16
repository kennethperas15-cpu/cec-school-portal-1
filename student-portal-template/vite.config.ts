import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone Student Portal template. Runs independently of the CEC portal app.
//
// Local dev mirrors the path style the CEC apps use, so the dashboard lives at
//   http://127.0.0.1:5180/cec-school-portal-1/
// and a bare "/" request simply redirects there.
//
// Production builds against the GitHub Pages sub-path so the template can sit
// alongside the CEC portal site at .../cec-school-portal-1/template/.
const DEV_BASE = '/cec-school-portal-1/';
const PAGES_BASE = '/cec-school-portal-1/template/';

export default defineConfig(({ command, isSsrBuild }) => ({
  base: command === 'build' ? PAGES_BASE : DEV_BASE,
  plugins: [
    react(),
    {
      name: 'template-root-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = (req as { url?: string }).url;
          if (!url || url === '/' || url.startsWith('/?')) {
            res.statusCode = 302;
            res.setHeader('Location', DEV_BASE);
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
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
