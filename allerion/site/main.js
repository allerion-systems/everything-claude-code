// Allerion website logic - cost calculator + scroll niceties. No framework.
// The default rate book here is a mirror of src/lib/cost-library.ts DEFAULTS;
// keep them in sync when the server-side book changes.

// ---------------- Default rate book (mirrors server) ----------------
const RATES = {
  A1010: { material: 120, labor: 240, equipment: 40, total: 400, unit: "m3", classification: "A-Substructure", desc: "Foundation strip + slab on grade" },
  B2010: { material: 120, labor: 110, equipment: 20, total: 250, unit: "m2", classification: "B-Shell",        desc: "Exterior walls" },
  B1010: { material: 90,  labor: 72,  equipment: 18, total: 180, unit: "m2", classification: "B-Shell",        desc: "Floor construction" },
  B3010: { material: 110, labor: 70,  equipment: 20, total: 200, unit: "m2", classification: "B-Shell",        desc: "Roof construction" },
  C1010: { material: 35,  labor: 50,  equipment: 5,  total: 90,  unit: "m2", classification: "C-Interiors",    desc: "Interior partitions" },
};

const M2_TO_FT2 = 10.7639;
const FT_USD = (n) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 10_000
      ? `$${(n / 1_000).toFixed(1)}K`
      : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

// ---------------- Calculator ----------------
function computeTakeoff({ length, width, stories, storyHeight }) {
  const area = length * width;
  const perimeter = 2 * (length + width);
  const height = stories * storyHeight;
  const gfa = area * stories;

  const rows = [
    {
      code: "A1010",
      qty: round2(perimeter * 0.6 * 0.3 + area * 0.15),
    },
    {
      code: "B2010",
      qty: round2(perimeter * height),
    },
    {
      code: "B1010",
      qty: round2(area * Math.max(0, stories - 1)),
    },
    {
      code: "B3010",
      qty: round2(area),
    },
    {
      code: "C1010",
      qty: round2(perimeter * height * 1.2),
    },
  ];

  let material = 0, labor = 0, equipment = 0, total = 0;
  const computed = rows.map((r) => {
    const rate = RATES[r.code];
    const cost_material = r.qty * rate.material;
    const cost_labor = r.qty * rate.labor;
    const cost_equipment = r.qty * rate.equipment;
    const cost_total = r.qty * rate.total;
    material += cost_material;
    labor += cost_labor;
    equipment += cost_equipment;
    total += cost_total;
    return { ...r, ...rate, cost_material, cost_labor, cost_equipment, cost_total };
  }).filter((r) => r.qty > 0);

  return { rows: computed, material, labor, equipment, total, gfa, perimeter, height };
}

function renderCalc() {
  const length = num("inLen");
  const width = num("inWid");
  const stories = Math.max(1, Math.round(num("inStories")));
  const storyHeight = num("inSh");

  const { rows, material, labor, equipment, total, gfa } = computeTakeoff({
    length, width, stories, storyHeight,
  });

  setText("outMaterial", FT_USD(material));
  setText("outLabor", FT_USD(labor));
  setText("outEquip", FT_USD(equipment));
  setText("outTotal", FT_USD(total));

  const gfaFt2 = gfa * M2_TO_FT2;
  setText("outGfa", `${gfaFt2.toLocaleString(undefined, { maximumFractionDigits: 0 })} ft²`);
  setText("outPerSf", total > 0 && gfaFt2 > 0 ? `$${(total / gfaFt2).toFixed(0)}` : "—");

  const dominant = rows.reduce((a, b) => (a.cost_total > b.cost_total ? a : b));
  setText("outDom", dominant.desc);

  // Stacked bar
  const sum = material + labor + equipment;
  byId("segMat").style.width = sum ? `${(material / sum) * 100}%` : "0";
  byId("segLab").style.width = sum ? `${(labor / sum) * 100}%` : "0";
  byId("segEqu").style.width = sum ? `${(equipment / sum) * 100}%` : "0";

  // Breakdown table
  const body = byId("rowsBody");
  body.innerHTML = rows.map((r) => `
    <tr>
      <td class="left">${r.desc} <span class="muted small">(${r.code})</span></td>
      <td>${r.qty.toLocaleString()}</td>
      <td>${r.unit}</td>
      <td>$${r.total}</td>
      <td><b>${FT_USD(r.cost_total)}</b></td>
    </tr>
  `).join("");
}

function num(id) {
  const v = parseFloat(byId(id).value);
  return Number.isFinite(v) && v > 0 ? v : 0;
}
function setText(id, t) { byId(id).textContent = t; }
function byId(id) { return document.getElementById(id); }
function round2(n) { return Math.round(n * 100) / 100; }

["inLen", "inWid", "inStories", "inSh"].forEach((id) => {
  const el = byId(id);
  if (el) el.addEventListener("input", renderCalc);
});
renderCalc();

// ---------------- Sticky nav shadow + scroll reveal ----------------
const nav = byId("nav");
const onScroll = () => {
  if (!nav) return;
  if (window.scrollY > 8) nav.classList.add("scrolled");
  else nav.classList.remove("scrolled");
};
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

// Auto-attach reveal observer to anything we care about.
const revealTargets = document.querySelectorAll(".card, .install-card, .timeline .step, .msg, .calc, .compare-tbl");
revealTargets.forEach((el) => el.setAttribute("data-reveal", ""));

if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.1, rootMargin: "0px 0px -60px 0px" });
  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("in"));
}
