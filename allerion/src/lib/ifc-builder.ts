// Minimal IFC2X3 STEP file emitter for an extruded building footprint.
// Produces a valid file that loads in BIMcollab Zoom, BIMvision, Revit (import),
// Solibri, and free IFC viewers. Single building, single storey, perimeter walls
// from the footprint polygon, and a flat roof at z = height.
//
// Scope is intentionally narrow: LOD1 only. For LOD2 with pitched roofs we'd
// emit IfcRoof + IfcSlab geometry from a triangulated roof mesh - that lands
// in v0.1 once we wire roof point detection in the viewer.

import type { LngLat } from "./geometry.js";

export interface IfcBuildInput {
  /** Footprint polygon in lon/lat, counter-clockwise when viewed from above. */
  footprint: LngLat[];
  /** Building eave height in metres above the footprint plane. */
  heightM: number;
  /** Friendly name written into the IFC project + building. */
  name: string;
  /** Postal address - written into IfcPostalAddress. */
  address?: string;
}

interface LocalPoint {
  x: number;
  y: number;
}

/** Convert lon/lat to a local ENU plane in metres anchored at the first vertex. */
function toLocal(footprint: LngLat[]): { origin: LngLat; points: LocalPoint[] } {
  const origin = footprint[0]!;
  const mPerDegLat = 111_320;
  const mPerDegLon = 111_320 * Math.cos((origin.lat * Math.PI) / 180);
  const points = footprint.map((p) => ({
    x: (p.lon - origin.lon) * mPerDegLon,
    y: (p.lat - origin.lat) * mPerDegLat,
  }));
  return { origin, points };
}

function nowIfcDate(): string {
  // IFC date format: YYYY-MM-DDTHH:MM:SS
  return new Date().toISOString().split(".")[0]!;
}

function fmt(n: number): string {
  // IFC STEP wants compact floats - 6 decimals is plenty for mm precision.
  return Number.isInteger(n) ? `${n}.` : n.toFixed(6).replace(/0+$/, "").replace(/\.$/, ".");
}

/**
 * Build an IFC2X3 STEP file as a string.
 * Returns the IFC text and a stable filename suggestion.
 */
export function buildIfc(input: IfcBuildInput): { ifc: string; filename: string } {
  const { footprint, heightM, name, address } = input;
  if (footprint.length < 3) {
    throw new Error("Footprint needs at least 3 points");
  }
  const { points } = toLocal(footprint);

  // Lines accumulated by id. IFC STEP files are #id = TYPE(...);
  const lines: string[] = [];
  let next = 1;
  const id = () => `#${next++}`;
  const add = (def: string) => {
    const ref = id();
    lines.push(`${ref}= ${def};`);
    return ref;
  };

  // --- Header (mandatory) ---
  const header = [
    "ISO-10303-21;",
    "HEADER;",
    `FILE_DESCRIPTION(('ViewDefinition [CoordinationView_V2.0]'),'2;1');`,
    `FILE_NAME('${name.replace(/'/g, "''")}.ifc','${nowIfcDate()}',(''),(''),'Allerion v0','Allerion','');`,
    `FILE_SCHEMA(('IFC2X3'));`,
    "ENDSEC;",
    "DATA;",
  ];

  // --- Units (metre, radian, second) ---
  const unitLen = add("IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.)");
  const unitArea = add("IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.)");
  const unitVol = add("IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.)");
  const unitAng = add("IFCSIUNIT(*,.PLANEANGLEUNIT.,$,.RADIAN.)");
  const unitTime = add("IFCSIUNIT(*,.TIMEUNIT.,$,.SECOND.)");
  const unitAssign = add(
    `IFCUNITASSIGNMENT((${unitLen},${unitArea},${unitVol},${unitAng},${unitTime}))`,
  );

  // --- Geometric representation context (3D world) ---
  const originPt = add(`IFCCARTESIANPOINT((${fmt(0)},${fmt(0)},${fmt(0)}))`);
  const dirZ = add(`IFCDIRECTION((${fmt(0)},${fmt(0)},${fmt(1)}))`);
  const dirX = add(`IFCDIRECTION((${fmt(1)},${fmt(0)},${fmt(0)}))`);
  const placement3D = add(`IFCAXIS2PLACEMENT3D(${originPt},${dirZ},${dirX})`);
  const repCtx = add(
    `IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-05,${placement3D},$)`,
  );

  // --- Owner / app ---
  const person = add("IFCPERSON($,$,'Allerion',$,$,$,$,$)");
  const org = add("IFCORGANIZATION($,'Allerion','Allerion MCP App',$,$)");
  const personOrg = add(`IFCPERSONANDORGANIZATION(${person},${org},$)`);
  const app = add(`IFCAPPLICATION(${org},'0.0.1','Allerion','allerion')`);
  const ts = Math.floor(Date.now() / 1000);
  const ownerHist = add(
    `IFCOWNERHISTORY(${personOrg},${app},$,.ADDED.,$,${personOrg},${app},${ts})`,
  );

  const guid = (seed: number) =>
    `'${Buffer.from(`${name}-${seed}-${ts}`).toString("base64").slice(0, 22)}'`;

  // --- Project, site, building, storey ---
  const project = add(
    `IFCPROJECT(${guid(1)},${ownerHist},'${name.replace(/'/g, "''")}',$,$,$,$,(${repCtx}),${unitAssign})`,
  );

  const sitePlacement = add(`IFCLOCALPLACEMENT($,${placement3D})`);
  const site = add(
    `IFCSITE(${guid(2)},${ownerHist},'Site','',$,${sitePlacement},$,$,.ELEMENT.,$,$,$,$,$)`,
  );

  const bldgPlacement = add(`IFCLOCALPLACEMENT(${sitePlacement},${placement3D})`);
  let postalAddrRef = "$";
  if (address) {
    postalAddrRef = add(
      `IFCPOSTALADDRESS($,$,$,$,('${address.replace(/'/g, "''")}'),$,$,$,$,$)`,
    );
  }
  const building = add(
    `IFCBUILDING(${guid(3)},${ownerHist},'${name.replace(/'/g, "''")}',$,$,${bldgPlacement},$,$,.ELEMENT.,$,$,${postalAddrRef})`,
  );

  const storeyPlacement = add(`IFCLOCALPLACEMENT(${bldgPlacement},${placement3D})`);
  const storey = add(
    `IFCBUILDINGSTOREY(${guid(4)},${ownerHist},'Ground Floor',$,$,${storeyPlacement},$,$,.ELEMENT.,${fmt(0)})`,
  );

  // --- Footprint as IfcPolyline (closed) ---
  const ptRefs = points.map((p) =>
    add(`IFCCARTESIANPOINT((${fmt(p.x)},${fmt(p.y)},${fmt(0)}))`),
  );
  const closingPt = ptRefs[0]!;
  const polyline = add(`IFCPOLYLINE((${[...ptRefs, closingPt].join(",")}))`);

  // --- One perimeter wall per edge, swept extrusion to building height ---
  const wallRefs: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.05) continue; // skip near-zero edges

    // Wall local axes: x along edge, y perpendicular inward, z up.
    const startPt = add(`IFCCARTESIANPOINT((${fmt(a.x)},${fmt(a.y)},${fmt(0)}))`);
    const wallDir = add(`IFCDIRECTION((${fmt(dx / len)},${fmt(dy / len)},${fmt(0)}))`);
    const wallZ = add(`IFCDIRECTION((${fmt(0)},${fmt(0)},${fmt(1)}))`);
    const wallAxis = add(`IFCAXIS2PLACEMENT3D(${startPt},${wallZ},${wallDir})`);
    const wallPlacement = add(`IFCLOCALPLACEMENT(${storeyPlacement},${wallAxis})`);

    // Profile: rectangle 0.2m thick by edge length
    const profOrigin = add(
      `IFCCARTESIANPOINT((${fmt(len / 2)},${fmt(0.1)}))`,
    );
    const profPos = add(`IFCAXIS2PLACEMENT2D(${profOrigin},$)`);
    const profile = add(
      `IFCRECTANGLEPROFILEDEF(.AREA.,'Wall200',${profPos},${fmt(len)},${fmt(0.2)})`,
    );

    const extrudeDir = add(`IFCDIRECTION((${fmt(0)},${fmt(0)},${fmt(1)}))`);
    const extrudePos = add(`IFCAXIS2PLACEMENT3D(${originPt},${dirZ},${dirX})`);
    const solid = add(
      `IFCEXTRUDEDAREASOLID(${profile},${extrudePos},${extrudeDir},${fmt(heightM)})`,
    );

    const shapeRep = add(
      `IFCSHAPEREPRESENTATION(${repCtx},'Body','SweptSolid',(${solid}))`,
    );
    const prodDefShape = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${shapeRep}))`);

    const wall = add(
      `IFCWALLSTANDARDCASE(${guid(100 + i)},${ownerHist},'Wall-${i + 1}','Perimeter wall',$,${wallPlacement},${prodDefShape},$)`,
    );
    wallRefs.push(wall);
  }

  // --- Flat roof slab at z = height ---
  const roofProfPts = ptRefs.join(",");
  const roofPoly = add(`IFCPOLYLINE((${roofProfPts},${closingPt}))`);
  const roofProfileCurve = add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,'Roof',${roofPoly})`);
  const roofExtrudePos = add(
    `IFCAXIS2PLACEMENT3D(${add(`IFCCARTESIANPOINT((${fmt(0)},${fmt(0)},${fmt(heightM)}))`)},${dirZ},${dirX})`,
  );
  const roofDir = add(`IFCDIRECTION((${fmt(0)},${fmt(0)},${fmt(1)}))`);
  const roofSolid = add(
    `IFCEXTRUDEDAREASOLID(${roofProfileCurve},${roofExtrudePos},${roofDir},${fmt(0.2)})`,
  );
  const roofRep = add(
    `IFCSHAPEREPRESENTATION(${repCtx},'Body','SweptSolid',(${roofSolid}))`,
  );
  const roofShape = add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${roofRep}))`);
  const roofPlacement = add(`IFCLOCALPLACEMENT(${storeyPlacement},${placement3D})`);
  const roofSlab = add(
    `IFCSLAB(${guid(900)},${ownerHist},'Roof','Flat roof slab',$,${roofPlacement},${roofShape},$,.ROOF.)`,
  );

  // --- Spatial containment ---
  add(
    `IFCRELAGGREGATES(${guid(10)},${ownerHist},$,$,${project},(${site}))`,
  );
  add(
    `IFCRELAGGREGATES(${guid(11)},${ownerHist},$,$,${site},(${building}))`,
  );
  add(
    `IFCRELAGGREGATES(${guid(12)},${ownerHist},$,$,${building},(${storey}))`,
  );
  add(
    `IFCRELCONTAINEDINSPATIALSTRUCTURE(${guid(13)},${ownerHist},$,$,(${[...wallRefs, roofSlab].join(",")}),${storey})`,
  );

  const tail = ["ENDSEC;", "END-ISO-10303-21;"];
  const ifc = [...header, ...lines, ...tail].join("\n");

  const filename = `${name.replace(/[^a-z0-9-_]/gi, "-").toLowerCase()}.ifc`;
  return { ifc, filename };
}
