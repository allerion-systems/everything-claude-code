// Cesium viewer bootstrap. Reads session/lat/lon/provider from query string,
// loads the right 3D provider, and hands click events to measure.js.

import { initMeasurement } from "./measure.js";

const params = new URLSearchParams(location.search);
const sessionId = params.get("session");
const lat = parseFloat(params.get("lat") ?? "0");
const lon = parseFloat(params.get("lon") ?? "0");
const altitude = parseFloat(params.get("altitude") ?? "200");
const provider = params.get("provider") ?? "osm-buildings";
const address = params.get("address") ?? "";

document.getElementById("addr").innerHTML =
  `<span class="pill">${provider}</span>${address}`;

// Cesium ion default token works for terrain/imagery; users with their own
// token get higher quotas. We don't strictly need ion for OSM mode.
Cesium.Ion.defaultAccessToken =
  window.CESIUM_ION_TOKEN ??
  "eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzNTI4MGFkMy1mNDU5LTQ4ODktYmU1Mi1hYjU5NjJjMzU4ZmIiLCJpZCI6MjU5LCJpYXQiOjE3MTQ5MDM5NjN9.placeholder";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  navigationHelpButton: false,
  animation: false,
  timeline: false,
  fullscreenButton: false,
  infoBox: false,
  selectionIndicator: false,
});
viewer.scene.globe.depthTestAgainstTerrain = true;

async function loadProvider() {
  if (provider === "google-3d-tiles") {
    // Google Photorealistic 3D Tiles. Requires a key set on the page via
    // ?key= or window.GOOGLE_MAPS_API_KEY (injected by the static server).
    const key = params.get("key") ?? window.GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.warn("No Google key, falling back to OSM Buildings.");
      return loadOsmBuildings();
    }
    try {
      const tileset = await Cesium.Cesium3DTileset.fromUrl(
        `https://tile.googleapis.com/v1/3dtiles/root.json?key=${key}`,
        { showCreditsOnScreen: true },
      );
      viewer.scene.primitives.add(tileset);
    } catch (e) {
      console.error("Google 3D Tiles failed, falling back to OSM.", e);
      return loadOsmBuildings();
    }
  } else {
    loadOsmBuildings();
  }
}

function loadOsmBuildings() {
  // Cesium's free OSM Buildings tileset - LOD1 extrusions, ion-hosted.
  Cesium.createOsmBuildingsAsync()
    .then((t) => viewer.scene.primitives.add(t))
    .catch((e) => console.error("OSM Buildings load failed:", e));
}

loadProvider();

// Fly to the target. Pitch ~-30deg gives a good 3D angle.
const target = Cesium.Cartesian3.fromDegrees(lon, lat, altitude);
viewer.camera.flyTo({
  destination: target,
  orientation: {
    heading: Cesium.Math.toRadians(30),
    pitch: Cesium.Math.toRadians(-30),
    roll: 0,
  },
  duration: 2.2,
});

initMeasurement(viewer, { sessionId, postUrl: "/measure" });
