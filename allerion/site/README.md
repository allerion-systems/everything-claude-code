# Allerion site

The official Allerion marketing site. Plain HTML/CSS/JS, no framework, no build
step. Deploy anywhere that serves static files.

## Local preview

```bash
# from this directory:
npx serve .

# or use the Allerion MCP project's static server (which can serve this dir too):
cd ..
SITE_DIR=./site npm run start:viewer
```

## Deploy

### Vercel

```bash
npx vercel deploy --prod ./allerion/site
```

`vercel.json` is configured for SPA-style fallback to `index.html`.

### Netlify

```bash
npx netlify deploy --dir=./allerion/site --prod
```

`_redirects` handles the same fallback.

### GitHub Pages

```bash
# from repo root, with site at allerion/site:
gh-pages -d allerion/site
```

### Cloudflare Pages

Point Pages at `allerion/site` as the build output directory. No build command
needed.

## Files

| File | Purpose |
|---|---|
| `index.html` | Single-page site |
| `styles.css` | All styling, dark theme, responsive |
| `main.js` | Cost calculator + scroll niceties |
| `favicon.svg` | Tab icon |
| `og.svg` | Open Graph / Twitter card image |
| `vercel.json` | Vercel config (SPA fallback) |
| `_redirects` | Netlify config (SPA fallback) |

## Cost calculator

The interactive calculator in the "Try it" section mirrors the default rate
book in `../src/lib/cost-library.ts`. When the server-side defaults change,
update `main.js` `RATES` to match. (Future: fetch the live JSON from
`/cost-library/defaults` if a hosted Allerion API URL is configured.)
