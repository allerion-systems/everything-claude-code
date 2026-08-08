#!/usr/bin/env node
/**
 * Allerion Brain — Ingest
 *
 * Turns a YouTube link (or pasted text / exported file) into a structured,
 * git-tracked markdown note the agent can read and act on.
 *
 * Zero external dependencies. Requires Node >= 18 (global fetch).
 *
 * Usage:
 *   node scripts/brain-ingest.js <youtube-url> [--domain roofing|allerion|general] [--title "..."]
 *   node scripts/brain-ingest.js --title "My note" --text "pasted transcript" [--domain ...]
 *   node scripts/brain-ingest.js --title "NotebookLM export" --file ./export.txt [--domain ...]
 *
 * Writes: brain/notes/<domain>/<YYYY-MM-DD>-<slug>.md  (status: needs-enrichment)
 * Then ask an agent to enrich it, or run any LLM over the raw note.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NOTES = path.join(ROOT, 'brain', 'notes');
const DOMAINS = ['roofing', 'allerion', 'general'];

function parseArgs(argv) {
  const args = { _: [], domain: 'general' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--domain') args.domain = argv[++i];
    else if (a === '--title') args.title = argv[++i];
    else if (a === '--text') args.text = argv[++i];
    else if (a === '--file') args.file = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

function usage() {
  console.log(`Allerion Brain — Ingest

  node scripts/brain-ingest.js <youtube-url> [--domain ${DOMAINS.join('|')}] [--title "..."]
  node scripts/brain-ingest.js --title "..." --text "pasted text" [--domain ...]
  node scripts/brain-ingest.js --title "..." --file ./export.txt [--domain ...]
`);
}

function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

// Walk braces from the first '{' after a marker, respecting strings/escapes.
function extractJsonAfter(html, marker) {
  const start = html.indexOf(marker);
  if (start === -1) return null;
  let i = html.indexOf('{', start);
  if (i === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(i, j + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

async function fetchYouTube(videoId) {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    Cookie: 'CONSENT=YES+1',
  };
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers });
  if (!res.ok) throw new Error(`YouTube returned HTTP ${res.status}`);
  const html = await res.text();

  const player = extractJsonAfter(html, 'ytInitialPlayerResponse');
  const title =
    player?.videoDetails?.title ||
    (html.match(/<title>([^<]*)<\/title>/)?.[1] || '').replace(/ - YouTube$/, '') ||
    `YouTube ${videoId}`;
  const author = player?.videoDetails?.author || '';

  const tracks =
    player?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  if (!tracks.length) {
    return { title: decodeEntities(title), author, transcript: null };
  }
  const track =
    tracks.find((t) => (t.languageCode || '').startsWith('en')) || tracks[0];
  const capRes = await fetch(`${track.baseUrl}&fmt=json3`, { headers });
  const data = await capRes.json();
  const transcript = (data.events || [])
    .map((e) => (e.segs || []).map((s) => s.utf8 || '').join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { title: decodeEntities(title), author, transcript: transcript || null };
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'note';
}

function frontmatter(obj) {
  const tags = `[${(obj.tags || []).join(', ')}]`;
  return [
    '---',
    `title: ${JSON.stringify(obj.title)}`,
    `source_url: ${JSON.stringify(obj.source_url || '')}`,
    `source_type: ${obj.source_type}`,
    `domain: ${obj.domain}`,
    `tags: ${tags}`,
    `ingested: ${obj.ingested}`,
    `status: ${obj.status}`,
    '---',
    '',
  ].join('\n');
}

function writeNote({ domain, title, sourceUrl, sourceType, content }) {
  const dir = path.join(NOTES, domain);
  fs.mkdirSync(dir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(dir, `${date}-${slugify(title)}.md`);
  const body = [
    frontmatter({
      title,
      source_url: sourceUrl,
      source_type: sourceType,
      domain,
      tags: [],
      ingested: date,
      status: 'needs-enrichment',
    }),
    '## Summary\n\n<!-- needs-enrichment -->\n',
    '## Key Points\n\n<!-- needs-enrichment -->\n',
    '## Action Items\n\n<!-- needs-enrichment -->\n',
    '## Source Content\n',
    content.trim(),
    '',
  ].join('\n');
  fs.writeFileSync(file, body);
  return file;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args._.length && !args.text && !args.file)) {
    usage();
    process.exit(args.help ? 0 : 1);
  }
  if (!DOMAINS.includes(args.domain)) {
    console.error(`Unknown --domain "${args.domain}". Use one of: ${DOMAINS.join(', ')}`);
    process.exit(1);
  }

  // Path 1: pasted text or file (works for NotebookLM exports, articles, anything).
  if (args.text || args.file) {
    const title = args.title || (args.file ? path.basename(args.file) : 'Untitled note');
    const content = args.text || fs.readFileSync(args.file, 'utf8');
    const file = writeNote({
      domain: args.domain,
      title,
      sourceUrl: args._[0] || '',
      sourceType: args.file ? 'doc' : 'manual',
      content,
    });
    console.log(`Wrote ${path.relative(ROOT, file)} (status: needs-enrichment)`);
    return;
  }

  // Path 2: YouTube URL.
  const url = args._[0];
  const videoId = extractVideoId(url);
  if (!videoId) {
    console.error(`Could not parse a YouTube video id from: ${url}`);
    process.exit(1);
  }
  try {
    const { title, transcript } = await fetchYouTube(videoId);
    if (!transcript) {
      console.error(
        `No captions found for "${title}". Re-run with --text "..." or --file to paste the transcript manually.`
      );
      process.exit(2);
    }
    const file = writeNote({
      domain: args.domain,
      title: args.title || title,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      sourceType: 'youtube',
      content: transcript,
    });
    console.log(`Wrote ${path.relative(ROOT, file)} (status: needs-enrichment)`);
  } catch (err) {
    console.error(`Ingest failed: ${err.message}`);
    console.error(
      'YouTube can block datacenter IPs. Run this on your Mac, or use --text / --file to paste the transcript.'
    );
    process.exit(2);
  }
}

main();
