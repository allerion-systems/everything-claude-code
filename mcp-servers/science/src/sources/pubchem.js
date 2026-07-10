// PubChem PUG-REST — https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
// Free, no key. Resolve a compound by name or CID and return key properties.

import { fetchJson } from "../http.js";

const PUG_REST = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PROPERTIES = [
  "MolecularFormula",
  "MolecularWeight",
  "IUPACName",
  "CanonicalSMILES",
  "InChIKey",
  "XLogP",
];

/**
 * Build the property-lookup URL for a compound identified by name or CID.
 * @param {{ name?: string, cid?: number|string }} params
 * @returns {string}
 */
export function buildPubchemPropertyUrl({ name, cid }) {
  const namespace = resolveNamespace({ name, cid });
  return `${PUG_REST}/compound/${namespace}/property/${PROPERTIES.join(",")}/JSON`;
}

/**
 * @param {any} json
 * @returns {{cid: number, formula: string, molecularWeight: string, iupacName: string, smiles: string, inchiKey: string, xLogP: number|null, url: string}|null}
 */
export function parsePubchemProperties(json) {
  const rows = json && json.PropertyTable && json.PropertyTable.Properties;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[0];
  return {
    cid: Number(row.CID),
    formula: row.MolecularFormula || "",
    molecularWeight: row.MolecularWeight != null ? String(row.MolecularWeight) : "",
    iupacName: row.IUPACName || "",
    smiles: row.CanonicalSMILES || "",
    inchiKey: row.InChIKey || "",
    xLogP: row.XLogP != null ? Number(row.XLogP) : null,
    url: `https://pubchem.ncbi.nlm.nih.gov/compound/${row.CID}`,
  };
}

/**
 * Look up a compound and return its normalized properties.
 * @param {{ name?: string, cid?: number|string }} params
 * @param {{ fetchImpl?: typeof fetch }} [deps]
 */
export async function getPubchemCompound(params, deps = {}) {
  const json = await fetchJson(buildPubchemPropertyUrl(params), { fetchImpl: deps.fetchImpl });
  return parsePubchemProperties(json);
}

/** @param {{ name?: string, cid?: number|string }} params */
function resolveNamespace({ name, cid }) {
  if (cid != null && String(cid).trim()) {
    const numeric = Math.trunc(Number(cid));
    if (!Number.isFinite(numeric) || numeric <= 0) throw new Error("PubChem: cid must be a positive integer");
    return `cid/${numeric}`;
  }
  if (name && name.trim()) {
    return `name/${encodeURIComponent(name.trim())}`;
  }
  throw new Error("PubChem: provide either name or cid");
}
