// Click-to-measure tooling. Hooks into Cesium screen-space events and posts
// completed measurements back to the MCP server's /measure endpoint, which
// runs the same geometry math as the server-side tool call.

export function initMeasurement(viewer, { sessionId, postUrl }) {
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  const results = document.getElementById("results");
  const buttons = document.querySelectorAll("[data-mode]");

  let mode = null;
  let workingPoints = [];
  const workingEntities = [];

  for (const btn of buttons) {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  }
  document.getElementById("clear").addEventListener("click", clearAll);
  document.getElementById("export").addEventListener("click", exportIfc);

  function setMode(next) {
    mode = next;
    workingPoints = [];
    for (const btn of buttons) btn.classList.toggle("active", btn.dataset.mode === mode);
  }

  handler.setInputAction((click) => {
    if (!mode) return;
    const cartesian = pickPosition(click.position);
    if (!cartesian) return;
    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    workingPoints.push({
      lon: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
      height: carto.height,
    });
    workingEntities.push(
      viewer.entities.add({
        position: cartesian,
        point: { pixelSize: 9, color: Cesium.Color.fromCssColorString("#3a6df0"), outlineColor: Cesium.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      }),
    );

    if (mode === "vertical" && workingPoints.length === 2) finalize();
    if (mode === "pitch" && workingPoints.length === 3) finalize();
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // Right-click finishes a polyline or polygon.
  handler.setInputAction(() => {
    if (mode === "polyline" || mode === "polygon") finalize();
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  function pickPosition(screen) {
    // Prefer hitting 3D Tiles geometry, fall back to terrain, then ellipsoid.
    const tilePick = viewer.scene.pickPosition(screen);
    if (tilePick && Cesium.defined(tilePick)) return tilePick;
    const ray = viewer.camera.getPickRay(screen);
    return ray ? viewer.scene.globe.pick(ray, viewer.scene) : null;
  }

  async function finalize() {
    if (workingPoints.length < 2) return;
    const payload = { session_id: sessionId, mode, points: workingPoints };
    let result;
    try {
      const res = await fetch(postUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      result = await res.json();
    } catch (e) {
      // Offline / sandbox mode: compute client-side so the UI still works.
      result = computeLocally(mode, workingPoints);
    }
    addResultRow(result);
    drawCompleted(mode, workingPoints);
    workingPoints = [];
    setMode(null);
  }

  function computeLocally(m, pts) {
    const R = 6378137;
    const toRad = (d) => (d * Math.PI) / 180;
    const hav = (a, b) => {
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lon - a.lon);
      const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
      const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
      return 2 * R * Math.asin(Math.sqrt(h));
    };
    if (m === "polyline") {
      let d = 0;
      for (let i = 1; i < pts.length; i++) {
        const flat = hav(pts[i - 1], pts[i]);
        const dh = pts[i].height - pts[i - 1].height;
        d += Math.sqrt(flat * flat + dh * dh);
      }
      return { mode: m, distance_m: d };
    }
    if (m === "vertical") return { mode: m, vertical_m: Math.abs(pts[1].height - pts[0].height) };
    if (m === "polygon") {
      let total = 0;
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
        total += toRad(p2.lon - p1.lon) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
      }
      return { mode: m, area_m2: Math.abs((total * R * R) / 2) };
    }
    return { mode: m };
  }

  function drawCompleted(m, pts) {
    if (m === "polygon" && pts.length >= 3) {
      viewer.entities.add({
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights(
            pts.flatMap((p) => [p.lon, p.lat, p.height]),
          ),
          material: Cesium.Color.fromCssColorString("#3a6df0").withAlpha(0.25),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#3a6df0"),
          perPositionHeight: true,
        },
      });
    } else if (m === "polyline" || m === "vertical") {
      viewer.entities.add({
        polyline: {
          positions: pts.map((p) => Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.height)),
          width: 3,
          material: Cesium.Color.fromCssColorString("#3a6df0"),
        },
      });
    }
  }

  function addResultRow(r) {
    const row = document.createElement("div");
    row.className = "result-row";
    const v =
      r.distance_m != null ? `${r.distance_m.toFixed(2)} m` :
      r.area_m2 != null ? `${r.area_m2.toFixed(2)} m²` :
      r.vertical_m != null ? `${r.vertical_m.toFixed(2)} m` :
      r.slope_deg != null ? `${r.slope_deg.toFixed(1)}°` : "—";
    row.innerHTML = `<div class="mode">${r.mode}</div><div class="val">${v}</div>`;
    results.prepend(row);
  }

  function clearAll() {
    viewer.entities.removeAll();
    workingEntities.length = 0;
    workingPoints = [];
    results.innerHTML = "";
  }

  async function exportIfc() {
    // The IFC export is a server-side tool call - in chat the user types
    // "export the IFC" and Claude invokes it. The button is a hint that
    // the workflow exists; we just surface a toast.
    addResultRow({ mode: "export", distance_m: null });
    const row = results.firstElementChild;
    if (row) row.querySelector(".val").textContent = "Ask the chat: export the IFC";
  }
}
