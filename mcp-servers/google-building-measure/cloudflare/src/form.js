// The web form served at GET /

export const HTML_FORM = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Building Measure — Roofr-style report from any address</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 980px; margin: 0 auto; padding: 24px 18px 80px; background: #fafafa; color: #111; }
  @media (prefers-color-scheme: dark) { body { background: #111; color: #eee; } }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p.lede { color: #666; margin: 0 0 24px; }
  .form-row { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  input[type=text] { flex: 1; min-width: 260px; padding: 12px 14px; font-size: 15px; border: 1px solid #ccc; border-radius: 8px; background: white; }
  @media (prefers-color-scheme: dark) { input[type=text] { background: #222; color: #eee; border-color: #444; } }
  button { padding: 12px 22px; font-size: 15px; font-weight: 600; background: #1e7afc; color: white; border: 0; border-radius: 8px; cursor: pointer; }
  button:disabled { background: #888; cursor: wait; }
  .options { font-size: 13px; color: #666; margin-bottom: 20px; }
  .options label { margin-right: 14px; cursor: pointer; }
  #status { margin: 16px 0; padding: 12px 14px; border-radius: 8px; background: #fff8e1; color: #6b5300; display: none; }
  #status.error { background: #ffebee; color: #b71c1c; }
  #status.ok { background: #e8f5e9; color: #1b5e20; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 18px 0; }
  .card { background: white; border: 1px solid #e0e0e0; border-radius: 10px; padding: 14px; }
  @media (prefers-color-scheme: dark) { .card { background: #1c1c1e; border-color: #333; } }
  .card .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .card .value { font-size: 22px; font-weight: 700; }
  .card .unit { font-size: 13px; color: #888; font-weight: 400; margin-left: 4px; }
  h2 { font-size: 16px; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e0e0e0; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #eee; }
  @media (prefers-color-scheme: dark) { th, td { border-bottom-color: #333; } }
  th { font-weight: 600; color: #555; font-size: 12px; text-transform: uppercase; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; max-height: 400px; overflow-y: auto; }
  @media (prefers-color-scheme: dark) { pre { background: #1c1c1e; } }
  .footer { margin-top: 40px; font-size: 12px; color: #999; }
  .footer code { background: #eee; padding: 2px 6px; border-radius: 4px; }
  @media (prefers-color-scheme: dark) { .footer code { background: #2a2a2a; } }
  .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px; vertical-align: -2px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <h1>🏠 Building Measure</h1>
  <p class="lede">Type a U.S. address. Get a Roofr-style takeoff in ~60 seconds.</p>

  <form id="form">
    <div class="form-row">
      <input type="text" id="address" placeholder="5396 Georgetown Greenville Road, Greenville IN 47124" autocomplete="off" required>
      <button type="submit" id="go">Generate report</button>
    </div>
    <div class="options">
      <label><input type="checkbox" id="skipStreet"> Skip Street View (faster, no window/door counts)</label>
      <label><input type="checkbox" id="skipAerial"> Skip Aerial View video lookup</label>
    </div>
  </form>

  <div id="status"></div>
  <div id="result"></div>

  <div class="footer">
    Also exposes: <code>POST /api/measure</code> (JSON API) · <code>POST /mcp</code> (MCP-over-HTTP for Claude / GPT)
  </div>

<script>
const form = document.getElementById('form');
const status = document.getElementById('status');
const result = document.getElementById('result');
const goBtn = document.getElementById('go');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const address = document.getElementById('address').value.trim();
  if (!address) return;
  goBtn.disabled = true;
  goBtn.innerHTML = '<span class="spinner"></span>Working...';
  status.className = '';
  status.style.display = 'block';
  status.textContent = 'Calling Google Solar + Static Maps + Street View + Gemini vision... up to 60s.';
  result.innerHTML = '';

  try {
    const res = await fetch('/api/measure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        skipStreetView: document.getElementById('skipStreet').checked,
        skipAerialView: document.getElementById('skipAerial').checked,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      status.className = 'error';
      status.textContent = 'Error: ' + (data.error || 'unknown');
      return;
    }
    status.className = 'ok';
    status.textContent = '✓ Report ready: ' + (data.address?.resolved || address);
    renderReport(data);
  } catch (err) {
    status.className = 'error';
    status.textContent = 'Network error: ' + err.message;
  } finally {
    goBtn.disabled = false;
    goBtn.textContent = 'Generate report';
  }
});

function renderReport(d) {
  const s = d.summary || {};
  const len = d.lengths || {};
  const m = d.materials || {};
  const aerial = d.aerialView || {};

  let html = '<div class="grid">';
  html += card('Total Roof Area', s.totalRoofAreaSqft, 'sqft');
  html += card('Total Facets', s.totalFacets);
  html += card('Predominant Pitch', s.predominantPitch);
  html += card('Confidence', d.dataQuality?.edgeAnalysisConfidence);
  html += '</div>';

  html += '<h2>Lineal feet per edge type</h2><table>';
  html += '<thead><tr><th>Edge</th><th>Length</th><th>Decimal ft</th></tr></thead><tbody>';
  for (const [key, label] of [
    ['eaves','Eaves (gutter line)'],['ridges','Ridges'],['hips','Hips'],
    ['valleys','Valleys'],['rakes','Rakes'],['wallFlashing','Wall flashing'],
    ['stepFlashing','Step flashing'],['hipsAndRidges','Hips + Ridges'],['eavesAndRakes','Eaves + Rakes']]) {
    const v = len[key];
    if (v) html += '<tr><td>'+label+'</td><td>'+(v.formatted||'')+'</td><td>'+(v.ft??'')+'</td></tr>';
  }
  html += '</tbody></table>';

  if (d.pitchBreakdown?.length) {
    html += '<h2>Pitch breakdown (from Solar API)</h2><table>';
    html += '<thead><tr><th>Pitch</th><th>Area sqft</th><th>Facets</th></tr></thead><tbody>';
    for (const p of d.pitchBreakdown) {
      html += '<tr><td>'+p.pitch+'</td><td>'+Math.round(p.areaSquareFeet)+'</td><td>'+p.facets+'</td></tr>';
    }
    html += '</tbody></table>';
  }

  if (m?.lineItems) {
    const li = m.lineItems;
    html += '<h2>Materials needed</h2><table>';
    html += '<thead><tr><th>Item</th><th>Coverage</th><th>Quantity</th></tr></thead><tbody>';
    html += '<tr><td>Shingle bundles (15% waste, GAF Timberline HDZ)</td><td>'+(m.wasteScenarios?.find(w=>w.wastePercent===15)?.grossSquareFeet||'-')+' sqft</td><td>'+(m.wasteScenarios?.find(w=>w.wastePercent===15)?.shingleBundles?.['GAF Timberline HDZ']||'-')+' bundles</td></tr>';
    html += '<tr><td>Starter strip</td><td>'+(li.starter?.coverageLf||'-')+' lf</td><td>'+(li.starter?.bundles||'-')+' bundles</td></tr>';
    html += '<tr><td>Ice & water shield</td><td>'+(li.iceAndWaterShield?.coverageLf||'-')+' lf</td><td>'+(li.iceAndWaterShield?.rolls||'-')+' rolls</td></tr>';
    html += '<tr><td>Synthetic underlayment</td><td>'+(li.syntheticUnderlayment?.totalSqft||'-')+' sqft</td><td>'+(li.syntheticUnderlayment?.rolls||'-')+' rolls</td></tr>';
    html += '<tr><td>Ridge caps</td><td>'+(li.ridgeCaps?.coverageLf||'-')+' lf</td><td>'+(li.ridgeCaps?.bundles||'-')+' bundles</td></tr>';
    html += '<tr><td>Drip edge (10ft pieces)</td><td>'+(li.dripEdge?.coverageLf||'-')+' lf</td><td>'+(li.dripEdge?.pieces10ft||'-')+' pieces</td></tr>';
    html += '<tr><td>Valley metal (10ft)</td><td>'+(li.valleyMetal?.coverageLf||'-')+' lf</td><td>'+(li.valleyMetal?.pieces10ft||'-')+' pieces</td></tr>';
    html += '</tbody></table>';
  }

  if (d.openings?.totals) {
    const o = d.openings.totals;
    html += '<h2>Openings (from Street View)</h2><div class="grid">';
    html += card('Windows', o.windows);
    html += card('Doors', o.doors);
    html += card('Garage doors', o.garage_doors);
    html += '</div>';
  }

  if (aerial?.covered && aerial?.videoUrls?.highDef) {
    html += '<h2>3D Aerial fly-around</h2>';
    html += '<p><a href="'+aerial.videoUrls.highDef+'" target="_blank">Open HD fly-around video →</a></p>';
  }

  if (d.dataQuality?.warnings?.length) {
    html += '<h2>Warnings</h2><ul>';
    for (const w of d.dataQuality.warnings) html += '<li>'+w+'</li>';
    html += '</ul>';
  }

  html += '<h2>Full JSON</h2><pre>' + JSON.stringify(d, null, 2) + '</pre>';
  result.innerHTML = html;
}

function card(label, value, unit) {
  if (value === undefined || value === null) value = '—';
  return '<div class="card"><div class="label">'+label+'</div><div class="value">'+value+(unit?' <span class="unit">'+unit+'</span>':'')+'</div></div>';
}
</script>
</body>
</html>`;
