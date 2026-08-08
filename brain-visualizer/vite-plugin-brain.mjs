import path from 'node:path';
import { buildGraph, getNote } from './server/parseBrain.mjs';

// Vite dev middleware: serves /api/graph and /api/note by parsing the brain
// directory at request time. No separate server process needed.
export function brainApi() {
  return {
    name: 'brain-api',
    configureServer(server) {
      const brainDir = path.resolve(process.cwd(), process.env.BRAIN_DIR || '../brain');
      server.config.logger.info(`[brain] serving graph from ${brainDir}`);
      server.middlewares.use((req, res, next) => {
        try {
          if (req.url.startsWith('/api/graph')) {
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(buildGraph(brainDir)));
            return;
          }
          if (req.url.startsWith('/api/note')) {
            const u = new URL(req.url, 'http://localhost');
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify(getNote(brainDir, u.searchParams.get('id'))));
            return;
          }
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
          return;
        }
        next();
      });
    },
  };
}
