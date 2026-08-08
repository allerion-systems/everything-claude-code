import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { marked } from 'marked';

// Color themes toggled from the right-hand control menu.
const THEMES = {
  purple: { bg: '#0b0614', nodes: ['#c792ea', '#a455f7', '#e0aaff'], link: 'rgba(167,99,250,0.45)', accent: '#b388ff' },
  green: { bg: '#04120c', nodes: ['#5eead4', '#34d399', '#a7f3d0'], link: 'rgba(52,211,153,0.45)', accent: '#34d399' },
  blue: { bg: '#040a16', nodes: ['#60a5fa', '#38bdf8', '#93c5fd'], link: 'rgba(56,189,248,0.45)', accent: '#38bdf8' },
};

const DIM_NODE = 'rgba(120,120,140,0.12)';
const DIM_LINK = 'rgba(120,120,140,0.05)';

export default function App() {
  const fgRef = useRef();
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [theme, setTheme] = useState('purple');
  const [particles, setParticles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/graph')
      .then((r) => r.json())
      .then(setGraph)
      .catch((e) => setError(String(e)));
  }, []);

  // Distinct groups -> palette index (stable order).
  const groups = useMemo(() => [...new Set(graph.nodes.map((n) => n.group))], [graph]);

  const colorFor = useCallback(
    (node) => {
      const t = THEMES[theme];
      const idx = Math.max(0, groups.indexOf(node.group));
      return t.nodes[idx % t.nodes.length];
    },
    [theme, groups]
  );

  // Adjacency for focus dimming.
  const adj = useMemo(() => {
    const m = new Map();
    for (const l of graph.links) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s).add(t);
      m.get(t).add(s);
    }
    return m;
  }, [graph]);

  const focusNode = useCallback((node) => {
    setSelected(node);
    setNote(null);
    fetch('/api/note?id=' + encodeURIComponent(node.id))
      .then((r) => r.json())
      .then(setNote)
      .catch(() => setNote(null));
    const fg = fgRef.current;
    if (fg && node.x != null) {
      const dist = 90;
      const ratio = 1 + dist / Math.hypot(node.x, node.y, node.z || 1);
      fg.cameraPosition({ x: node.x * ratio, y: node.y * ratio, z: (node.z || 0) * ratio }, node, 1600);
    }
  }, []);

  const reset = useCallback(() => {
    setSelected(null);
    setNote(null);
  }, []);

  const nodeColor = useCallback(
    (node) => {
      if (!selected) return colorFor(node);
      if (node.id === selected.id) return '#ffffff';
      if ((adj.get(selected.id) || new Set()).has(node.id)) return colorFor(node);
      return DIM_NODE;
    },
    [selected, colorFor, adj]
  );

  const linkColor = useCallback(
    (l) => {
      const t = THEMES[theme];
      if (!selected) return t.link;
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const tg = typeof l.target === 'object' ? l.target.id : l.target;
      return s === selected.id || tg === selected.id ? t.accent : DIM_LINK;
    },
    [selected, theme]
  );

  const isIncident = (l) => {
    if (!selected) return false;
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const tg = typeof l.target === 'object' ? l.target.id : l.target;
    return s === selected.id || tg === selected.id;
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return graph.nodes;
    return graph.nodes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.group || '').toLowerCase().includes(q) ||
        (n.tags || []).join(' ').toLowerCase().includes(q)
    );
  }, [graph, query]);

  return (
    <div className="app" style={{ background: THEMES[theme].bg }}>
      {/* Left: search + node list + selected note content */}
      <aside className="panel left">
        <h1>🧠 Allerion Brain</h1>
        <input
          className="search"
          placeholder="Search nodes, domains, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {error && <p className="error">Could not load graph: {error}</p>}
        <div className="list">
          {results.map((n) => (
            <button
              key={n.id}
              className={'item' + (selected && selected.id === n.id ? ' active' : '')}
              onClick={() => focusNode(n)}
            >
              <span className="dot" style={{ background: colorFor(n) }} />
              <span className="item-title">{n.title}</span>
              <small>{n.group}</small>
            </button>
          ))}
        </div>
        {note && (
          <div className="note">
            <h2>{note.title}</h2>
            <div className="md" dangerouslySetInnerHTML={{ __html: marked.parse(note.content || '') }} />
          </div>
        )}
      </aside>

      <ForceGraph3D
        ref={fgRef}
        graphData={graph}
        backgroundColor={THEMES[theme].bg}
        nodeColor={nodeColor}
        nodeVal={(n) => 2 + (adj.get(n.id) ? adj.get(n.id).size : 0)}
        nodeLabel={(n) => (showLabels ? `${n.title}  ·  ${n.group}` : '')}
        nodeOpacity={0.95}
        linkColor={linkColor}
        linkWidth={(l) => (isIncident(l) ? 2.5 : 0.6)}
        linkDirectionalParticles={particles ? 2 : 0}
        linkDirectionalParticleWidth={(l) => (isIncident(l) ? 3 : 1.4)}
        linkDirectionalParticleSpeed={0.006}
        onNodeClick={focusNode}
        onBackgroundClick={reset}
        enableNodeDrag={false}
      />

      {/* Right: visual controls */}
      <aside className="panel right">
        <h3>Controls</h3>
        <label className="toggle">
          <input type="checkbox" checked={particles} onChange={(e) => setParticles(e.target.checked)} />
          Directional particle flows
        </label>
        <label className="toggle">
          <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
          Node labels
        </label>

        <h4>Color theme</h4>
        <div className="themes">
          {Object.keys(THEMES).map((t) => (
            <button
              key={t}
              className={'theme-btn' + (t === theme ? ' active' : '')}
              onClick={() => setTheme(t)}
              style={{ borderColor: THEMES[t].accent, color: THEMES[t].accent }}
            >
              {t}
            </button>
          ))}
        </div>

        <h4>Legend</h4>
        <div className="legend">
          {groups.map((g, i) => (
            <div key={g} className="legend-row">
              <span className="dot" style={{ background: THEMES[theme].nodes[i % THEMES[theme].nodes.length] }} />
              {g}
            </div>
          ))}
        </div>

        <p className="hint">Click a node to focus &amp; load its note. Click empty space to reset.</p>
        <p className="count">
          {graph.nodes.length} nodes · {graph.links.length} links
        </p>
      </aside>
    </div>
  );
}
