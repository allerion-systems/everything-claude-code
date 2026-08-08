# Allerion Brain — 3D Visualizer

A local, interactive 3D knowledge graph of your [`brain/`](../brain) markdown notes.
Nodes are notes; edges are the markdown links between them. Built with React +
[`react-force-graph-3d`](https://github.com/vasturiano/react-force-graph), with a
zero-dependency markdown/frontmatter parser on the backend.

## Run it

From this directory, on your Mac:

```bash
npm install
npm run dev
```

This launches the localhost (default <http://localhost:5180>) and opens it. One
process serves both the UI and the graph API — a Vite dev middleware parses the
brain at request time, so there's no separate server to start.

> Point it at a different brain directory:
> `BRAIN_DIR=../some/other/brain npm run dev`

## What it does

- **3D graph view** of every note, colored by domain (roofing / allerion / general).
- **Click a node** → it's highlighted and zoomed in on; everything else dims; the
  note's contents render in the left panel.
- **Left panel** → search by title, domain, or tag; click any result to focus it.
- **Right panel** → toggle directional particle flows and node labels; switch color
  themes (purple / green / blue); domain legend; live node/link counts.

## How nodes & edges are derived

- Each `*.md` file under `brain/` becomes a node.
- Frontmatter (`title`, `domain`/`type`, `theme`, `tags`, `status`) styles it.
- Markdown links `[text](other-note.md)` and wikilinks `[[other-note]]` become edges.
- More interlinking between notes = a richer graph. Link new notes to a domain
  overview or the knowledge map to keep things connected.

## Architecture

```
brain-visualizer/
  index.html
  vite.config.js          # react plugin + brain API middleware
  vite-plugin-brain.mjs    # /api/graph and /api/note (dev middleware)
  server/parseBrain.mjs    # zero-dep markdown -> {nodes, links}; also a CLI
  src/
    main.jsx
    App.jsx                # graph + panels + interactions
    styles.css
```

Inspect the parsed graph without the UI:

```bash
npm run graph        # prints node/link counts + the full graph JSON
```

## Notes

- Dev mode is the intended way to run (the API is dev middleware). `npm run build`
  produces a static UI bundle, but it needs the `/api/*` endpoints to be served.
- `node_modules` and `dist` are gitignored — run `npm install` after cloning.
