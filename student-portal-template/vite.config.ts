import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Connect } from 'vite';

// Standalone Student Portal template. Runs independently of the CEC portal app.
//
// One dev server on 5173 serves the whole CEC website, matching the published
// layout so nothing has to be un-learned between localhost and Pages:
//   /cec-school-portal-1/           the landing page and its sign-in popover
//   /cec-school-portal-1/template/  this dashboard
//
// One origin is the point, not a convenience: the popover's session lives in
// localStorage, so the dashboard can only adopt that session — and signing out
// can only hand the student back to the landing page — while both are served
// from the same origin. The landing page comes from .portal/, a build of
// ../clients produced by scripts/build-portal.mjs. The two paths must stay
// different, or signing out would send the dashboard to itself.
const BASE = '/cec-school-portal-1/template/';
const PORTAL_BASE = '/cec-school-portal-1/';
const PORTAL_DIR = path.resolve(fileURLToPath(new URL('./.portal', import.meta.url)));

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
};

/** Shown at the landing-page path when the portal copy has not been built. */
const MISSING_COPY_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>CEC landing page not built</title>
    <style>
      body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
             background: #0E2340; color: #dbe7f5; font: 15px/1.7 system-ui, -apple-system, sans-serif; }
      main { max-width: 40rem; padding: 2rem; }
      h1 { margin: 0 0 0.75rem; font-size: 1.05rem; color: #fff; }
      code { padding: 0.15rem 0.4rem; border-radius: 0.35rem; background: rgba(255, 255, 255, 0.12); }
    </style>
  </head>
  <body>
    <main>
      <h1>The CEC landing page has not been built yet</h1>
      <p>Port 5173 serves the whole CEC website, so this path needs a local build of the portal:</p>
      <p><code>npm run portal:build</code></p>
      <p>Then reload. <code>npm run dev</code> builds it automatically when it is out of date.</p>
    </main>
  </body>
</html>
`;

/**
 * Serves the built portal copy at PORTAL_BASE so port 5173 carries the landing
 * page as well as the dashboard. Anything under BASE belongs to Vite and is
 * passed straight through.
 */
function servePortalCopy(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url ?? '';
    if (!url.startsWith(PORTAL_BASE) || url.startsWith(BASE)) {
      next();
      return;
    }

    const index = path.join(PORTAL_DIR, 'index.html');
    if (!existsSync(index)) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(MISSING_COPY_PAGE);
      return;
    }

    let relative: string;
    try {
      relative = decodeURIComponent(url.split('?')[0].split('#')[0].slice(PORTAL_BASE.length));
    } catch {
      res.statusCode = 400;
      res.end('Malformed request');
      return;
    }

    // Resolve inside the copy only, so an encoded "../" cannot escape it.
    const target = path.resolve(PORTAL_DIR, relative);
    const inside = target === PORTAL_DIR || target.startsWith(PORTAL_DIR + path.sep);
    const onDisk = inside && existsSync(target) && statSync(target).isFile() ? target : null;
    // Single-page app: an unknown path with no extension still renders the page.
    const file = onDisk ?? (inside && !path.extname(target) ? index : null);
    if (!file) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
    res.setHeader('Content-Length', String(statSync(file).size));
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file).pipe(res);
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  base: BASE,
  plugins: [
    react(),
    {
      name: 'template-static-layout',
      // Dev and preview both serve the same two paths from one port.
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = (req as { url?: string }).url;
          if (!url || url === '/' || url.startsWith('/?')) {
            res.statusCode = 302;
            res.setHeader('Location', BASE);
            res.end();
            return;
          }
          next();
        });
        server.middlewares.use(servePortalCopy());
      },
      configurePreviewServer(server) {
        server.middlewares.use(servePortalCopy());
      },
    },
  ],
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      // Dev only, and it must be the API the CEC portal's own dev server talks
      // to: the session is shared, so a token minted by one side has to validate
      // on the other. Both dev servers therefore hit the local API on 4000.
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
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
