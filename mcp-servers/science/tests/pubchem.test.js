import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildPubchemPropertyUrl,
  parsePubchemProperties,
  getPubchemCompound,
} from "../src/sources/pubchem.js";

const SAMPLE = {
  PropertyTable: {
    Properties: [
      {
        CID: 2244,
        MolecularFormula: "C9H8O4",
        MolecularWeight: "180.16",
        IUPACName: "2-acetyloxybenzoic acid",
        CanonicalSMILES: "CC(=O)OC1=CC=CC=C1C(=O)O",
        InChIKey: "BSYNRYMUTXBXSQ-UHFFFAOYSA-N",
        XLogP: 1.2,
      },
    ],
  },
};

test("buildPubchemPropertyUrl by name url-encodes the name", () => {
  const url = buildPubchemPropertyUrl({ name: "acetylsalicylic acid" });
  assert.match(url, /compound\/name\/acetylsalicylic%20acid\/property/);
  assert.match(url, /MolecularFormula/);
});

test("buildPubchemPropertyUrl by cid", () => {
  assert.match(buildPubchemPropertyUrl({ cid: 2244 }), /compound\/cid\/2244\/property/);
});

test("buildPubchemPropertyUrl requires an identifier", () => {
  assert.throws(() => buildPubchemPropertyUrl({}), /provide either name or cid/);
});

test("buildPubchemPropertyUrl rejects a non-positive cid", () => {
  assert.throws(() => buildPubchemPropertyUrl({ cid: 0 }), /positive integer/);
});

test("parsePubchemProperties normalizes the first row", () => {
  const c = parsePubchemProperties(SAMPLE);
  assert.equal(c.cid, 2244);
  assert.equal(c.formula, "C9H8O4");
  assert.equal(c.molecularWeight, "180.16");
  assert.equal(c.xLogP, 1.2);
  assert.equal(c.url, "https://pubchem.ncbi.nlm.nih.gov/compound/2244");
});

test("parsePubchemProperties returns null when empty", () => {
  assert.equal(parsePubchemProperties({ PropertyTable: { Properties: [] } }), null);
});

test("getPubchemCompound uses injected fetch", async () => {
  const fetchImpl = async () => new Response(JSON.stringify(SAMPLE), { status: 200 });
  const c = await getPubchemCompound({ name: "aspirin" }, { fetchImpl });
  assert.equal(c.formula, "C9H8O4");
});
