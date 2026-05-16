// 5D dashboard renderer. Pulls the estimate + session geometry from the
// MCP server, paints a Bexel-style cost dashboard, and shows the building
// footprint extruded in a Cesium viewer that's color-coded by classification.

const params = new URLSearchParams(location.search);
const sessionId = params.get("session");
if (!sessionId) document.body.textContent = "Missing ?session=... param";

// Brand palette from the CSS variables, kept in sync for chart colors.
const COLORS = {
  material: "#ff5fa7",
  labor: "#5fdfff",
  equipment: "#ffcc5f",
  total: "#7df57d",
  classes: {
    "A-Substructure": "#a878ff",
    "B-Shell": "#5fdfff",
    "C-Interiors": "#ffcc5f",
    "D-Services": "#7df57d",
    "E-Equipment": "#ff5fa7",
  },
};

const fmtUSD = (n) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 10_000
      ? `$${(n / 1000).toFixed(1)}K`
      : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const fmtUSDLong = (n) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

async function main() {
  const [estimate, session] = await Promise.all([
    fetch(`/estimate?session=${sessionId}`).then((r) => r.json()),
    fetch(`/session?session=${sessionId}`).then((r) => r.json()),
  ]);

  if (estimate.error) {
    document.body.innerHTML = `<div style="padding:40px;color:#ff5f5f;font-family:monospace">${estimate.error}</div>`;
    return;
  }

  document.getElementById("bldgAddress").textContent = session.address ?? "Untitled building";
  document.getElementById("totMaterial").textContent = fmtUSD(estimate.material);
  document.getElementById("totLabor").textContent = fmtUSD(estimate.labor);
  document.getElementById("totEquip").textContent = fmtUSD(estimate.equipment);
  document.getElementById("totTotal").textContent = fmtUSD(estimate.total);
  document.getElementById("modelMeta").textContent =
    `${estimate.gross_floor_area_m2.toFixed(0)} m² GFA · ${session.lastBuildingHeight?.toFixed(1) ?? "?"}m tall · ${session.geometry_source ?? "manual"} source`;
  document.getElementById("tableMeta").textContent = `${estimate.rows.length} elements`;

  renderTable(estimate.rows);
  renderCharts(estimate);
  renderViewer(session, estimate);

  const liveCount = estimate.rows.filter((r) => r.source === "live").length;
  document.getElementById("srcCitation").textContent =
    `Cost rates: ${liveCount}/${estimate.rows.length} live from DDC CWICR API · rest from Allerion defaults`;
}

function renderTable(rows) {
  const byClass = new Map();
  for (const r of rows) {
    if (!byClass.has(r.classification)) byClass.set(r.classification, { total: 0, items: [] });
    const g = byClass.get(r.classification);
    g.items.push(r);
    g.total += r.cost_total;
  }

  const tbody = document.querySelector("#costTable tbody");
  tbody.innerHTML = "";
  for (const [cls, g] of byClass) {
    const headRow = document.createElement("tr");
    headRow.className = "classification-row";
    headRow.innerHTML = `<td class="left" colspan="7">${cls}</td><td>${fmtUSD(g.total)}</td>`;
    tbody.appendChild(headRow);

    for (const r of g.items) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="left">${r.description} <span class="pill ${r.source === "live" ? "live" : ""}">${r.source}</span></td>
        <td>${r.quantity.toLocaleString()}</td>
        <td>${r.unit}</td>
        <td>${fmtUSDLong(r.rate_total)}</td>
        <td style="color:${COLORS.material}">${fmtUSD(r.cost_material)}</td>
        <td style="color:${COLORS.labor}">${fmtUSD(r.cost_labor)}</td>
        <td style="color:${COLORS.equipment}">${fmtUSD(r.cost_equipment)}</td>
        <td><b>${fmtUSD(r.cost_total)}</b></td>
      `;
      tr.title = r.citation ?? "";
      tbody.appendChild(tr);
    }
  }
}

function renderCharts(estimate) {
  Chart.defaults.color = "#aaa";
  Chart.defaults.font.family = '-apple-system, "Segoe UI", system-ui, sans-serif';
  Chart.defaults.font.size = 11;

  const byClass = new Map();
  for (const r of estimate.rows) {
    byClass.set(r.classification, (byClass.get(r.classification) ?? 0) + r.cost_total);
  }
  doughnut("chartClass",
    [...byClass.keys()],
    [...byClass.values()],
    [...byClass.keys()].map((k) => COLORS.classes[k] ?? "#888"));

  doughnut("chartComp",
    ["Material", "Labor", "Equipment"],
    [estimate.material, estimate.labor, estimate.equipment],
    [COLORS.material, COLORS.labor, COLORS.equipment]);

  const liveTotal = estimate.rows.filter((r) => r.source === "live").reduce((s, r) => s + r.cost_total, 0);
  const defaultTotal = estimate.total - liveTotal;
  doughnut("chartSource",
    ["Live API (DDC CWICR)", "Allerion default rates"],
    [liveTotal, defaultTotal],
    [COLORS.total, "#555"]);
}

function doughnut(id, labels, data, colors) {
  new Chart(document.getElementById(id), {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: "#0a0a0d", borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "62%",
      plugins: {
        legend: { position: "right", labels: { boxWidth: 10, padding: 8 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmtUSDLong(ctx.parsed)}` } },
      },
    },
  });
}

function renderViewer(session, estimate) {
  Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzNTI4MGFkMy1mNDU5LTQ4ODktYmU1Mi1hYjU5NjJjMzU4ZmIiLCJpZCI6MjU5LCJpYXQiOjE3MTQ5MDM5NjN9.placeholder";

  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    baseLayerPicker: false, geocoder: false, homeButton: false,
    sceneModePicker: false, navigationHelpButton: false, animation: false,
    timeline: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
  });
  viewer.scene.globe.depthTestAgainstTerrain = true;

  Cesium.createOsmBuildingsAsync()
    .then((t) => viewer.scene.primitives.add(t))
    .catch(() => {});

  const fp = session.lastFootprint;
  const height = session.lastBuildingHeight ?? 6;
  if (!fp || fp.length < 3) return;

  // Color the building by the dominant classification's color.
  const dominant = estimate.rows.reduce((a, b) => (a.cost_total > b.cost_total ? a : b));
  const color = Cesium.Color.fromCssColorString(
    COLORS.classes[dominant.classification] ?? COLORS.total,
  ).withAlpha(0.55);

  viewer.entities.add({
    name: session.address ?? "Building",
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(fp.flatMap((p) => [p.lon, p.lat])),
      extrudedHeight: height,
      height: 0,
      material: color,
      outline: true,
      outlineColor: Cesium.Color.WHITE,
    },
  });

  const ctr = fp.reduce((a, p) => ({ lon: a.lon + p.lon, lat: a.lat + p.lat }), { lon: 0, lat: 0 });
  ctr.lon /= fp.length;
  ctr.lat /= fp.length;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(ctr.lon, ctr.lat, Math.max(height * 4, 150)),
    orientation: {
      heading: Cesium.Math.toRadians(35),
      pitch: Cesium.Math.toRadians(-40),
      roll: 0,
    },
    duration: 1.8,
  });
}

main().catch((e) => {
  document.body.innerHTML = `<div style="padding:40px;color:#ff5f5f;font-family:monospace">Failed to load dashboard: ${e.message}</div>`;
});
