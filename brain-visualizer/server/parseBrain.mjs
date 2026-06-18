import fs from 'node:fs';
import path from 'node:path';

// Zero-dependency frontmatter parser (same dialect as scripts/brain-index.js).
export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // Strip YAML inline comments (a space before '#'), but not quoted values or leading hex.
    if (!/^["'[]/.test(val)) {
      const c = val.search(/\s#/);
      if (c !== -1) val = val.slice(0, c).trim();
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }
  return { data, body: text.slice(m[0].length) };
}

function walk(dir, base, out) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    const abs = path.join(dir, entry);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) walk(abs, base, out);
    else if (entry.endsWith('.md')) out.push({ abs, id: path.relative(base, abs).split(path.sep).join('/') });
  }
  return out;
}

function inferGroup(id, data) {
  if (data.domain) return data.domain;
  if (data.type) return data.type;
  // notes/<domain>/file.md -> <domain>
  const parts = id.split('/');
  if (parts[0] === 'notes' && parts[1]) return parts[1];
  return 'general';
}

function titleFrom(id, data, body) {
  if (data.title) return data.title;
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return id.replace(/\.md$/, '').split('/').pop();
}

// Build {nodes, links} from a brain directory of markdown files.
export function buildGraph(brainDir) {
  const files = walk(brainDir, brainDir, []);
  const byId = new Map();
  const nodes = [];

  for (const f of files) {
    const raw = fs.readFileSync(f.abs, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const node = {
      id: f.id,
      title: titleFrom(f.id, data, body),
      group: inferGroup(f.id, data),
      type: data.type || data.source_type || 'note',
      theme: data.theme || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      status: data.status || '',
      source_url: data.source_url || '',
      excerpt: body.replace(/<!--[\s\S]*?-->/g, '').replace(/[#>*_`-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160),
    };
    byId.set(f.id, { node, body });
    nodes.push(node);
  }

  const links = [];
  const seen = new Set();
  const idList = [...byId.keys()];
  for (const [id, { body }] of byId) {
    const fromDir = path.posix.dirname(id);
    // Standard markdown links [text](target.md)
    const mdLinks = [...body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
    // Wikilinks [[target]]
    const wikiLinks = [...body.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);

    for (let target of [...mdLinks, ...wikiLinks]) {
      if (/^https?:\/\//i.test(target) || target.startsWith('#') || target.startsWith('mailto:')) continue;
      target = target.split('#')[0].trim();
      if (!target) continue;
      if (!target.endsWith('.md')) target += '.md';
      let resolved = path.posix.normalize(path.posix.join(fromDir === '.' ? '' : fromDir, target));
      if (!byId.has(resolved)) {
        // try matching by filename or title (wikilink style)
        const base = path.posix.basename(target);
        const match = idList.find((x) => path.posix.basename(x) === base);
        if (match) resolved = match;
      }
      if (byId.has(resolved) && resolved !== id) {
        const key = `${id}->${resolved}`;
        if (!seen.has(key)) {
          seen.add(key);
          links.push({ source: id, target: resolved });
        }
      }
    }
  }

  return { nodes, links };
}

// Safely read one note's raw markdown by id (prevents path traversal).
export function getNote(brainDir, id) {
  if (!id) throw new Error('missing id');
  const abs = path.resolve(brainDir, id);
  const root = path.resolve(brainDir);
  if (!abs.startsWith(root + path.sep) && abs !== root) throw new Error('invalid id');
  if (!abs.endsWith('.md') || !fs.existsSync(abs)) throw new Error('not found');
  const raw = fs.readFileSync(abs, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  return { id, title: data.title || id, content: body.trim() || raw };
}

// CLI: node server/parseBrain.mjs <brainDir>
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = path.resolve(process.argv[2] || '../brain');
  const g = buildGraph(dir);
  console.log(JSON.stringify({ dir, nodeCount: g.nodes.length, linkCount: g.links.length, ...g }, null, 2));
}
