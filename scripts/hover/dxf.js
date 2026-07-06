/**
 * Minimal ASCII DXF (R12 / AC1009) writer with zero dependencies.
 *
 * R12 is intentionally chosen because it is the most universally readable
 * DXF dialect: AutoCAD, DraftSight, LibreCAD, QCAD, BricsCAD and most
 * plan-review viewers open it without translation.
 *
 * Coordinates are written as-is; callers decide the model unit (this
 * project draws in decimal feet).
 */

const LINETYPES = {
  CONTINUOUS: { desc: 'Solid line', pattern: [] },
  DASHED: { desc: 'Dashed __ __ __', pattern: [0.5, -0.25] },
  CENTER: { desc: 'Center ____ _ ____', pattern: [1.25, -0.25, 0.25, -0.25] },
  HIDDEN: { desc: 'Hidden _ _ _', pattern: [0.25, -0.125] }
};

class DxfWriter {
  constructor() {
    this.layers = new Map();
    this.entities = [];
  }

  /**
   * Register a layer. color is an AutoCAD Color Index (1 red, 2 yellow,
   * 3 green, 4 cyan, 5 blue, 6 magenta, 7 white/black, 8 gray).
   */
  addLayer(name, color = 7, linetype = 'CONTINUOUS') {
    if (!LINETYPES[linetype]) {
      throw new Error(`Unknown linetype "${linetype}" for layer ${name}`);
    }
    this.layers.set(name, { color, linetype });
    return this;
  }

  ensureLayer(name) {
    if (!this.layers.has(name)) this.addLayer(name);
  }

  line(layer, x1, y1, x2, y2) {
    this.ensureLayer(layer);
    this.entities.push([
      0, 'LINE', 8, layer,
      10, fmt(x1), 20, fmt(y1), 30, 0,
      11, fmt(x2), 21, fmt(y2), 31, 0
    ]);
    return this;
  }

  polyline(layer, points, closed = false) {
    this.ensureLayer(layer);
    const groups = [0, 'POLYLINE', 8, layer, 66, 1, 70, closed ? 1 : 0];
    for (const [x, y] of points) {
      groups.push(0, 'VERTEX', 8, layer, 10, fmt(x), 20, fmt(y), 30, 0);
    }
    groups.push(0, 'SEQEND', 8, layer);
    this.entities.push(groups);
    return this;
  }

  circle(layer, cx, cy, r) {
    this.ensureLayer(layer);
    this.entities.push([0, 'CIRCLE', 8, layer, 10, fmt(cx), 20, fmt(cy), 30, 0, 40, fmt(r)]);
    return this;
  }

  /**
   * Single-line TEXT. options: rotation (degrees), align ('left'|'center'|'right').
   */
  text(layer, x, y, height, value, options = {}) {
    this.ensureLayer(layer);
    const { rotation = 0, align = 'left' } = options;
    const groups = [
      0, 'TEXT', 8, layer,
      10, fmt(x), 20, fmt(y), 30, 0,
      40, fmt(height), 1, sanitizeText(value)
    ];
    if (rotation) groups.push(50, fmt(rotation));
    if (align === 'center' || align === 'right') {
      groups.push(72, align === 'center' ? 1 : 2);
      groups.push(11, fmt(x), 21, fmt(y), 31, 0);
    }
    this.entities.push(groups);
    return this;
  }

  toString() {
    const out = [];
    const push = (...groups) => {
      for (let i = 0; i < groups.length; i += 2) {
        out.push(String(groups[i]), String(groups[i + 1]));
      }
    };

    // HEADER
    push(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 0, 'ENDSEC');

    // TABLES: linetypes then layers
    push(0, 'SECTION', 2, 'TABLES');
    const usedLinetypes = new Set(['CONTINUOUS']);
    for (const { linetype } of this.layers.values()) usedLinetypes.add(linetype);
    push(0, 'TABLE', 2, 'LTYPE', 70, usedLinetypes.size);
    for (const name of usedLinetypes) {
      const lt = LINETYPES[name];
      const total = lt.pattern.reduce((sum, d) => sum + Math.abs(d), 0);
      push(0, 'LTYPE', 2, name, 70, 0, 3, lt.desc, 72, 65, 73, lt.pattern.length, 40, fmt(total));
      for (const dash of lt.pattern) push(49, fmt(dash));
    }
    push(0, 'ENDTAB');
    push(0, 'TABLE', 2, 'LAYER', 70, this.layers.size);
    for (const [name, { color, linetype }] of this.layers) {
      push(0, 'LAYER', 2, name, 70, 0, 62, color, 6, linetype);
    }
    push(0, 'ENDTAB', 0, 'ENDSEC');

    // ENTITIES
    push(0, 'SECTION', 2, 'ENTITIES');
    for (const groups of this.entities) push(...groups);
    push(0, 'ENDSEC', 0, 'EOF');

    return out.join('\n') + '\n';
  }
}

function fmt(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) throw new Error(`Non-finite coordinate in DXF output: ${n}`);
  return Number(num.toFixed(6));
}

function sanitizeText(value) {
  return String(value).replace(/[\r\n]+/g, ' ');
}

module.exports = { DxfWriter, LINETYPES };
