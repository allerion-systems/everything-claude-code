/* Allerion War Room — offline-first pursuit board.
 *
 * Board state (stage, requirement owners/statuses, locally added pursuits) lives
 * in IndexedDB on the device. Seeded pursuits ship with the bundle and are
 * refreshed from data/pursuits.json whenever the network allows.
 */
"use strict";

const STAGES = ["HUNT", "ANALYZE", "PRICE", "SUBMIT", "CLOSED"];
const OWNERS = ["Human", "Crumbs Hunter", "Analyst", "Closer"];
const STATUSES = ["Open", "In work", "Delivered"];
const DEFAULT_STAGE = "HUNT";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let pursuits = [];
let state = {};          // id -> {stage, reqs:[{owner,status}]}
const byId = (id) => pursuits.find((p) => p.id === id);

/* ── IndexedDB ───────────────────────────────────────────────────── */
const DB_NAME = "allerion-warboard";
const DB_VERSION = 1;
let idb = null;

function openDb() {
  return new Promise((resolve) => {
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch { return resolve(null); }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("state")) db.createObjectStore("state", { keyPath: "id" });
      if (!db.objectStoreNames.contains("custom")) db.createObjectStore("custom", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

function tx(store, mode, fn) {
  if (!idb) return Promise.resolve(null);
  return new Promise((resolve) => {
    let t;
    try { t = idb.transaction(store, mode); } catch { return resolve(null); }
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => resolve(null);
    t.onabort = () => resolve(null);
  });
}

const putState = (id) => tx("state", "readwrite", (s) => s.put({ id, ...state[id] }));
const putCustom = (p) => tx("custom", "readwrite", (s) => s.put(p));
const allFrom = (store) => tx(store, "readonly", (s) => s.getAll());

/* ── Model helpers ───────────────────────────────────────────────── */
function daysLeft(iso) {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Infinity : (t - Date.now()) / 86400000;
}
const dated = (p) => !p.tbd && Number.isFinite(daysLeft(p.due));
const expired = (p) => dated(p) && daysLeft(p.due) < 0;
// Live = still biddable: has a future deadline. Excludes both past-due and
// pre-solicitations with no date posted.
const live = (p) => dated(p) && !expired(p);
const urgency = (d) => (d < 5 ? "crit" : d < 10 ? "warn" : "");

function ensureState(p) {
  if (!state[p.id]) {
    state[p.id] = {
      stage: STAGES.includes(p.stage) ? p.stage : DEFAULT_STAGE,
      reqs: p.reqs.map((r) => ({ owner: r.owner, status: "Open" })),
    };
  }
  const st = state[p.id];
  if (!Array.isArray(st.reqs)) st.reqs = [];
  while (st.reqs.length < p.reqs.length) {
    st.reqs.push({ owner: p.reqs[st.reqs.length].owner || "Human", status: "Open" });
  }
  return st;
}
const delivered = (p) => ensureState(p).reqs.filter((r) => r.status === "Delivered").length;
const openPursuits = () => pursuits.filter((p) => ensureState(p).stage !== "CLOSED");

/* ── Router ──────────────────────────────────────────────────────── */
function showView(name) {
  $$(".navb").forEach((b) => b.classList.toggle("on", b.dataset.nav === name));
  $$("main section[data-view]").forEach((s) => s.classList.toggle("on", s.dataset.view === name));
  if (name === "brief") renderBrief();
}

/* ── Backend detection ───────────────────────────────────────────────
 * The AI endpoints only exist where the deployment runs functions with an
 * OpenAI key. On plain static hosting they 404, so every AI affordance stays
 * hidden and the board keeps working exactly as before. */
let aiState = "unknown"; // unknown | ready | unconfigured | absent

async function probeBackend() {
  if (!navigator.onLine) { aiState = "absent"; return; }
  try {
    // An empty body is a deliberate 400 from a live endpoint — cheap liveness
    // check that costs no tokens.
    const res = await fetch("api/analyst", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (res.status === 503) aiState = "unconfigured";
    else if (res.status === 404) aiState = "absent";
    else aiState = "ready";
  } catch {
    aiState = "absent";
  }
}
$$(".navb").forEach((b) => b.addEventListener("click", () => showView(b.dataset.nav)));

/* ── Tiles ───────────────────────────────────────────────────────── */
function renderTiles() {
  const open = openPursuits();
  const upcoming = open.filter(live).sort((a, b) => daysLeft(a.due) - daysLeft(b.due));
  const next = upcoming[0];
  const soonest = next ? daysLeft(next.due) : Infinity;
  const week = upcoming.filter((p) => daysLeft(p.due) <= 7).length;
  const stale = open.filter(expired).length;
  const inWork = open.filter((p) => !expired(p))
    .reduce((n, p) => n + ensureState(p).reqs.filter((r) => r.status !== "Delivered").length, 0);
  $("#tiles").innerHTML = `
    <div class="tile ${soonest < 5 ? "hot" : ""}">
      <div class="n mono">${next ? Math.floor(soonest) : "—"}<em> days</em></div>
      <div class="l">to next deadline${next ? ` (${esc(next.sol)})` : ""}</div></div>
    <div class="tile"><div class="n mono">${week}<em> of ${upcoming.length}</em></div>
      <div class="l">live quotes due within 7 days</div></div>
    <div class="tile ${stale ? "hot" : ""}"><div class="n mono">${stale}</div>
      <div class="l">past due — close these out</div></div>
    <div class="tile"><div class="n mono">${inWork}</div>
      <div class="l">requirements not yet delivered</div></div>`;
}

/* ── Kanban ──────────────────────────────────────────────────────── */
function cardHtml(p) {
  const d = daysLeft(p.due);
  const past = expired(p);
  const u = p.tbd ? "" : past ? "crit" : urgency(d);
  const done = delivered(p);
  const chip = p.tbd ? "TBD"
    : past ? "PAST DUE"
    : `${u === "crit" ? "⚠ " : ""}${Math.floor(d)}d`;
  return `
  <article class="card ${p.flagship ? "flagship" : ""} ${past ? "stale" : ""}" draggable="true" tabindex="0"
           data-id="${esc(p.id)}" aria-label="${esc(p.title)} — open mission control">
    <div class="agency">${esc(p.agency)}</div>
    <h4>${esc(p.title)}</h4>
    <div class="row">
      <span class="cd ${u}">${chip}</span>
      <span class="sol">${esc(p.sol)}</span>
    </div>
    <div class="prog" aria-hidden="true"><i style="width:${p.reqs.length ? (done / p.reqs.length) * 100 : 0}%"></i></div>
    <div class="meta-b"><span class="ck">${done}/${p.reqs.length} delivered</span>
      ${p.flagship ? '<span class="cd">FLAGSHIP</span>' : ""}</div>
  </article>`;
}

function renderBoard() {
  $("#kanban").innerHTML = STAGES.map((s) => {
    const cards = pursuits.filter((p) => ensureState(p).stage === s)
      .sort((a, b) => daysLeft(a.due) - daysLeft(b.due));
    return `
    <div class="col" data-stage="${s}">
      <div class="col-h"><h3>${s}</h3><span class="cnt">${cards.length}</span></div>
      <div class="col-body">
        ${cards.map(cardHtml).join("")
          || `<div class="empty">${s === "CLOSED" ? "wins & no-bids land here" : "drop a card here"}</div>`}
      </div>
    </div>`;
  }).join("");
}

let dragId = null;
document.addEventListener("dragstart", (e) => {
  const c = e.target.closest(".card"); if (!c) return;
  dragId = c.dataset.id; c.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  try { e.dataTransfer.setData("text/plain", dragId); } catch { /* Safari */ }
});
document.addEventListener("dragend", (e) => {
  const c = e.target.closest(".card"); if (c) c.classList.remove("dragging");
  $$(".col").forEach((x) => x.classList.remove("dragover"));
});
document.addEventListener("dragover", (e) => {
  const col = e.target.closest(".col"); if (!col || !dragId) return;
  e.preventDefault(); e.dataTransfer.dropEffect = "move";
  $$(".col").forEach((x) => x.classList.toggle("dragover", x === col));
});
document.addEventListener("drop", (e) => {
  const col = e.target.closest(".col"); if (!col || !dragId) return;
  e.preventDefault();
  setStage(dragId, col.dataset.stage);
  dragId = null;
});

function setStage(id, stage) {
  if (!state[id] || state[id].stage === stage) { renderBoard(); return; }
  state[id].stage = stage;
  putState(id);
  renderAll();
}

$("#kanban").addEventListener("click", (e) => {
  const c = e.target.closest(".card"); if (c) openMission(c.dataset.id);
});
$("#kanban").addEventListener("keydown", (e) => {
  const c = e.target.closest(".card");
  if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openMission(c.dataset.id); }
});

/* ── Mission control ─────────────────────────────────────────────── */
const scrim = $("#scrim"), modal = $("#modal");
function closeModal() { scrim.classList.remove("on"); modal.innerHTML = ""; }
scrim.addEventListener("click", (e) => { if (e.target === scrim) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function openMission(id) {
  const p = byId(id); if (!p) return;
  const st = ensureState(p);
  // Seeded notes ship with the bundle and carry light markup; locally added
  // pursuits are user input and are escaped.
  const noteHtml = p.custom ? esc(p.note) : p.note;
  modal.innerHTML = `
    <div class="modal-h"><h3>${esc(p.title)}</h3><button class="x" aria-label="Close">✕</button></div>
    <div class="modal-b">
      <div class="tags"><span class="tag sa">${esc(p.setAside)}</span>
        ${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <div class="kv">
        <b>Solicitation</b><span class="mono"><a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.sol)} ↗</a></span>
        <b>Agency</b><span>${esc(p.agency)}</span>
        <b>Due</b><span class="mono">${esc(p.dueLabel)}${p.tbd ? "" : ` · ${Math.max(0, daysLeft(p.due)).toFixed(1)} days out`}</span>
        ${p.poc ? `<b>POC</b><span class="mono">${esc(p.poc)}</span>` : ""}
      </div>
      <div class="note">${noteHtml}</div>

      <div class="sec-lab">Requirements to win — owner &amp; status</div>
      <div class="reqs">
        ${p.reqs.map((req, i) => {
          const r = st.reqs[i];
          return `
          <div class="req ${r.status === "Delivered" ? "delivered" : ""}" data-i="${i}">
            <span class="t">${esc(req.label)}</span>
            <select class="owner" aria-label="Owner for: ${esc(req.label)}">
              ${OWNERS.map((o) => `<option ${o === r.owner ? "selected" : ""}>${o}</option>`).join("")}
            </select>
            <select class="status" data-v="${r.status}" aria-label="Status for: ${esc(req.label)}">
              ${STATUSES.map((s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>`;
        }).join("")}
      </div>

      ${aiState === "ready" ? `
      <div class="work">
        <div class="work-h">
          <h4>Solicitation Analyst</h4>
          <button class="btn" id="run-analyst">▶ Run analyst on this bid</button>
        </div>
        <div class="work-out" id="work-out"></div>
      </div>` : ""}

      <div class="dispatch">Dispatch the engineering team from a Claude Code session in the repo:
        <code>/govcon ${esc(p.sol)}</code> — hunts the documents, builds the compliance matrix,
        drafts the quote package.</div>

      <div class="move-row">
        <label for="mv">Stage</label>
        <select id="mv">${STAGES.map((s) => `<option ${s === st.stage ? "selected" : ""}>${s}</option>`).join("")}</select>
        <button class="btn ghost" id="mclose" style="margin-left:auto">Done</button>
      </div>
    </div>`;
  scrim.classList.add("on");
  $(".x", modal).addEventListener("click", closeModal);
  $("#mclose", modal).addEventListener("click", closeModal);
  $("#mv", modal).addEventListener("change", (e) => setStage(id, e.target.value));
  $$(".req", modal).forEach((row) => {
    const i = +row.dataset.i;
    $(".owner", row).addEventListener("change", (e) => { st.reqs[i].owner = e.target.value; putState(id); });
    $(".status", row).addEventListener("change", (e) => {
      st.reqs[i].status = e.target.value;
      e.target.dataset.v = e.target.value;
      row.classList.toggle("delivered", e.target.value === "Delivered");
      putState(id); renderAll();
    });
  });
  const runBtn = $("#run-analyst", modal);
  if (runBtn) runBtn.addEventListener("click", () => runAnalyst(p, runBtn));
  $(".x", modal).focus();
}

/* ── Analyst (streamed from the edge function) ───────────────────── */
async function runAnalyst(p, btn) {
  const out = $("#work-out");
  if (!out) return;
  btn.disabled = true;
  out.textContent = "Analyst working…";
  const st = ensureState(p);
  try {
    const res = await fetch("api/analyst", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pursuit: {
          title: p.title, sol: p.sol, agency: p.agency, setAside: p.setAside,
          dueLabel: p.dueLabel,
          daysOut: p.tbd ? null : daysLeft(p.due),
          note: p.note,
          reqs: p.reqs.map((r, i) => ({ label: r.label, owner: st.reqs[i].owner, status: st.reqs[i].status })),
        },
      }),
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      out.textContent = err.message || "The analyst could not be reached.";
      btn.disabled = false;
      return;
    }
    out.textContent = "";
    await readSse(res.body, {
      delta: (d) => { out.textContent += d.text; },
      error: (d) => { out.textContent = d.message || "The analyst run failed."; },
    });
    btn.textContent = "Re-run analyst";
  } catch {
    out.textContent = "The analyst could not be reached.";
  }
  btn.disabled = false;
}

async function readSse(body, handlers) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const frame of frames) {
      let event = "message", data = "";
      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (!data) continue;
      let parsed;
      try { parsed = JSON.parse(data); } catch { continue; }
      handlers[event]?.(parsed);
    }
  }
}

/* ── Discover — plain-English opportunity search ─────────────────── */
function wireSearch() {
  const form = $("#search-form");
  if (!form) return;
  const status = $("#search-status"), results = $("#search-results"), input = $("#search-q");

  if (aiState !== "ready") {
    status.classList.add("on");
    status.textContent = aiState === "unconfigured"
      ? "Search is unavailable: this deployment has no OPENAI_API_KEY set."
      : "Search needs the deployed version with edge functions — it is unavailable offline "
        + "and on plain static hosting.";
    $("#search-go").disabled = true;
    input.disabled = true;
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    const btn = $("#search-go");
    btn.disabled = true;
    status.classList.add("on");
    status.textContent = "Interpreting, then sweeping SAM.gov…";
    results.innerHTML = "";
    try {
      const res = await fetch("api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) { status.textContent = data.message || "That search failed."; btn.disabled = false; return; }
      renderSearch(data, status, results);
    } catch {
      status.textContent = "Could not reach the search endpoint.";
    }
    btn.disabled = false;
  });
}

function renderSearch(data, status, results) {
  const i = data.interpreted || {};
  const chips = [
    ...(i.naics || []).map((n) => `NAICS ${n}`),
    ...(i.setAsides || []).map((s) => s || "Unrestricted"),
    ...(i.states || []),
  ];
  status.innerHTML = `<b>Read as:</b> ${esc(i.intent || "—")}`
    + (chips.length ? `<div class="tags">${chips.map((c) => `<span class="tag">${esc(c)}</span>`).join("")}</div>` : "")
    + (data.note ? `<div class="grid-note">${esc(data.note)}</div>` : "");

  if (!data.results || !data.results.length) {
    results.innerHTML = '<p class="none">Nothing open matched. Try naming the work the way a '
      + 'solicitation would title it.</p>';
    return;
  }
  results.innerHTML = `<div class="results">${data.results.map((r) => `
    <article class="hit ${r.eligible ? "" : "blocked"}">
      <div class="hit-h">
        <h4>${esc(r.title)}</h4>
        <span class="cd ${r.daysOut !== null && r.daysOut < 5 ? "crit" : ""}">${
          r.daysOut === null ? "no date" : `${r.daysOut}d`}</span>
      </div>
      <div class="row">
        <span class="tag ${r.eligible ? "sa" : ""}">${esc(r.setAsideLabel)}</span>
        ${r.naics ? `<span class="tag">NAICS ${esc(r.naics)}</span>` : ""}
        ${r.placeOfPerformance ? `<span class="tag">${esc(r.placeOfPerformance)}</span>` : ""}
        ${r.eligible ? "" : '<span class="tag ineligible">Certification not held</span>'}
      </div>
      <p class="hit-d">${esc(r.description.slice(0, 260))}${r.description.length > 260 ? "…" : ""}</p>
      <div class="hit-f">
        <span class="sol">${esc(r.solicitationNumber || "")}</span>
        <a href="${esc(r.url)}" target="_blank" rel="noopener">Open on SAM.gov ↗</a>
        ${r.eligible ? `<button class="btn ghost add-hit" data-hit='${esc(JSON.stringify({
          title: r.title, sol: r.solicitationNumber, agency: r.placeOfPerformance || "—",
          setAside: r.setAsideLabel, due: r.responseDeadline, url: r.url,
        }))}'>+ Board</button>` : ""}
      </div>
    </article>`).join("")}</div>`;

  $$(".add-hit", results).forEach((b) => b.addEventListener("click", () => addFromHit(JSON.parse(b.dataset.hit), b)));
}

async function addFromHit(hit, btn) {
  const due = hit.due || "";
  const p = {
    id: "c" + Date.now().toString(36),
    custom: true, tbd: !due,
    title: hit.title, sol: hit.sol || "TBD", agency: hit.agency,
    due,
    dueLabel: due
      ? new Date(due).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "No deadline posted",
    setAside: hit.setAside, tags: ["From Discover"],
    note: "Added from a Discover search — run the analyst or dispatch /govcon for intel.",
    link: hit.url,
    reqs: [
      { label: "Pull solicitation & attachments", owner: "Analyst" },
      { label: "Supplier quote", owner: "Human" },
      { label: "Build pricing + quote letter", owner: "Closer" },
      { label: "Submit the quote", owner: "Human" },
    ],
  };
  pursuits.push(p);
  ensureState(p);
  await putCustom(p);
  await putState(p.id);
  btn.textContent = "On board ✓";
  btn.disabled = true;
  renderAll();
}

/* ── Add pursuit ─────────────────────────────────────────────────── */
$("#add-btn").addEventListener("click", () => {
  modal.innerHTML = `
    <div class="modal-h"><h3>Add Pursuit</h3><button class="x" aria-label="Close">✕</button></div>
    <div class="modal-b">
      <div class="field"><label for="f-title">Title</label><input id="f-title" placeholder="What's being bought"></div>
      <div class="f2">
        <div class="field"><label for="f-sol">Solicitation #</label><input id="f-sol" placeholder="e.g. 36C25526Q0700"></div>
        <div class="field"><label for="f-due">Quote deadline</label><input id="f-due" type="datetime-local"></div>
      </div>
      <div class="f2">
        <div class="field"><label for="f-agency">Agency</label><input id="f-agency" placeholder="e.g. VA · Kansas City"></div>
        <div class="field"><label for="f-sa">Set-aside</label>
          <select id="f-sa" style="width:100%">
            <option>Total Small Business</option><option>Unrestricted</option><option>Partial Small Business</option>
            <option>SDVOSB</option><option>8(a)</option><option>HUBZone</option><option>WOSB</option>
          </select></div>
      </div>
      <div class="field"><label for="f-note">Intel note (optional)</label><textarea id="f-note" rows="2"></textarea></div>
      <div class="move-row"><button class="btn" id="f-save">Add to board</button>
        <button class="btn ghost" id="f-cancel" style="margin-left:auto">Cancel</button></div>
    </div>`;
  scrim.classList.add("on");
  $(".x", modal).addEventListener("click", closeModal);
  $("#f-cancel", modal).addEventListener("click", closeModal);
  $("#f-save", modal).addEventListener("click", async () => {
    const title = $("#f-title").value.trim();
    if (!title) { $("#f-title").focus(); return; }
    const dueRaw = $("#f-due").value;
    const due = dueRaw ? new Date(dueRaw).toISOString() : "";
    const sol = $("#f-sol").value.trim() || "TBD";
    const p = {
      id: "c" + Date.now().toString(36),
      custom: true, tbd: !due,
      title, sol,
      agency: $("#f-agency").value.trim() || "—",
      due,
      dueLabel: due
        ? new Date(due).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
        : "No deadline set",
      setAside: $("#f-sa").value,
      tags: ["Added on board"],
      note: $("#f-note").value.trim() || "Added from the board — dispatch /govcon for intel.",
      link: "https://sam.gov/search/?keywords=" + encodeURIComponent(sol),
      reqs: [
        { label: "Pull solicitation & attachments", owner: "Analyst" },
        { label: "Supplier quote", owner: "Human" },
        { label: "Build pricing + quote letter", owner: "Closer" },
        { label: "Submit the quote", owner: "Human" },
      ],
    };
    pursuits.push(p);
    ensureState(p);
    await putCustom(p);
    await putState(p.id);
    closeModal(); renderAll();
  });
  $("#f-title", modal).focus();
});

/* ── Charts ──────────────────────────────────────────────────────── */
const tip = $("#tip");
function showTip(html, x, y) {
  tip.innerHTML = html; tip.style.display = "block";
  const r = tip.getBoundingClientRect();
  tip.style.left = Math.min(x + 14, innerWidth - r.width - 10) + "px";
  tip.style.top = Math.min(y + 14, innerHeight - r.height - 10) + "px";
}
const hideTip = () => { tip.style.display = "none"; };
document.addEventListener("pointermove", (e) => {
  const t = e.target.closest("[data-tip]");
  t ? showTip(t.dataset.tip, e.clientX, e.clientY) : hideTip();
});
document.addEventListener("focusin", (e) => {
  const t = e.target.closest("[data-tip]");
  if (t) { const r = t.getBoundingClientRect(); showTip(t.dataset.tip, r.left, r.bottom); }
});
document.addEventListener("focusout", hideTip);

function renderRunway() {
  const open = openPursuits().filter(live).sort((a, b) => daysLeft(a.due) - daysLeft(b.due));
  if (!open.length) { $("#runway").innerHTML = '<p class="grid-note">No live dated pursuits open.</p>'; return; }
  const max = Math.max(...open.map((p) => daysLeft(p.due)), 1);
  $("#runway").innerHTML = open.map((p) => {
    const d = Math.max(0, daysLeft(p.due));
    const u = urgency(d);
    const w = Math.max(2, (d / max) * 100);
    return `
      <div class="lab">${esc(p.title.split("—")[0].split(",")[0])}<span class="mono">${esc(p.sol)}</span></div>
      <div class="track" data-tip="<b>${esc(p.title)}</b><br>Due ${esc(p.dueLabel)} — ${d.toFixed(1)} days" tabindex="0">
        <div class="cbar ${u ? "b-" + u : ""}" style="width:${w}%"></div>
        <span class="bar-val" style="left:calc(${w}% + 7px)">${Math.floor(d)}d${u === "crit" ? " ⚠" : ""}</span>
      </div>`;
  }).join("");
}

function renderStageChart() {
  const counts = STAGES.map((s) => ({ s, n: pursuits.filter((p) => ensureState(p).stage === s).length }));
  const max = Math.max(...counts.map((c) => c.n), 1);
  $("#stagechart").innerHTML = counts.map(({ s, n }) => {
    const w = Math.max(2, (n / max) * 100);
    return `
      <div class="lab">${s}</div>
      <div class="track" data-tip="<b>${s}</b><br>${n} pursuit${n === 1 ? "" : "s"}" tabindex="0">
        <div class="cbar" style="width:${w}%"></div>
        <span class="bar-val" style="left:calc(${w}% + 7px)">${n}</span>
      </div>`;
  }).join("");
}

/* ── Daily brief — computed from board state, no network needed ──── */
function renderBrief() {
  const open = openPursuits();
  const urgent = open.filter(live).filter((p) => daysLeft(p.due) <= 10)
    .sort((a, b) => daysLeft(a.due) - daysLeft(b.due));
  const waiting = open.filter((p) => p.tbd);
  const stale = open.filter(expired).sort((a, b) => daysLeft(a.due) - daysLeft(b.due));

  const item = (p) => {
    const st = ensureState(p);
    const openReqs = p.reqs.map((r, i) => ({ r, s: st.reqs[i] })).filter((x) => x.s.status !== "Delivered");
    const blocking = openReqs[0];
    const d = Math.floor(daysLeft(p.due));
    const when = p.tbd ? "no date posted"
      : d < 0 ? `closed ${Math.abs(d)} day${Math.abs(d) === 1 ? "" : "s"} ago`
      : `${d} day${d === 1 ? "" : "s"} out`;
    return `<li><b>${esc(p.title)}</b> — ${esc(p.sol)}, ${when}.
      ${expired(p)
        ? "Move to CLOSED or confirm an extension with the CO."
        : blocking
          ? `Next: ${esc(blocking.r.label)} <span class="mono">(${esc(blocking.s.owner)}, ${esc(blocking.s.status)})</span>.`
          : "All requirements delivered — ready to submit."}</li>`;
  };

  $("#brief").innerHTML = `
    ${stale.length ? `<div class="grp">
      <h3>Past due — clear the board</h3>
      <ol>${stale.map(item).join("")}</ol>
    </div>` : ""}
    <div class="grp">
      <h3>Closing within 10 days</h3>
      ${urgent.length ? `<ol>${urgent.map(item).join("")}</ol>`
        : '<p class="none">Nothing closing inside ten days.</p>'}
    </div>
    <div class="grp">
      <h3>Waiting on a solicitation</h3>
      ${waiting.length ? `<ol>${waiting.map(item).join("")}</ol>`
        : '<p class="none">No pre-solicitation pursuits tracked.</p>'}
    </div>
    <div class="grp">
      <h3>Running the analyst</h3>
      <p class="none">This app holds no API credentials — a key shipped to a browser is a key
      published. For a written go/no-go, open the repo in Claude Code and dispatch
      <code>/govcon &lt;solicitation&gt;</code>, which reads the actual solicitation documents.</p>
    </div>`;
}

function renderAll() { renderTiles(); renderBoard(); renderRunway(); renderStageChart(); }

/* ── Boot ────────────────────────────────────────────────────────── */
async function loadPursuits() {
  const res = await fetch("data/pursuits.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`pursuits.json: HTTP ${res.status}`);
  return res.json();
}

async function boot() {
  idb = await openDb();
  await probeBackend();
  wireSearch();
  $("#storage-note").textContent = idb ? "" : "Storage unavailable — changes will not survive a reload.";

  let data;
  try {
    data = await loadPursuits();
  } catch {
    $("#kanban").innerHTML = '<div class="empty">Could not load pursuit data. '
      + 'Reconnect once so the board can cache itself, then it works offline.</div>';
    return;
  }
  pursuits = data.pursuits || [];
  $("#data-date").textContent = data.generated || "unknown";

  const customs = await allFrom("custom");
  for (const p of customs || []) if (p && p.id && !byId(p.id)) pursuits.push(p);

  const saved = await allFrom("state");
  for (const row of saved || []) {
    if (row && row.id) state[row.id] = { stage: row.stage || DEFAULT_STAGE, reqs: row.reqs || [] };
  }
  pursuits.forEach(ensureState);

  renderAll();
  const view = new URLSearchParams(location.search).get("view");
  if (["board", "discover", "intel", "brief"].includes(view)) showView(view);
}

/* ── Network state ───────────────────────────────────────────────── */
function netState() {
  const el = $("#net-state");
  const on = navigator.onLine;
  el.dataset.state = on ? "online" : "offline";
  el.textContent = on ? "online" : "offline";
}
addEventListener("online", netState);
addEventListener("offline", netState);
netState();

/* ── Install prompt ──────────────────────────────────────────────── */
let deferredInstall = null;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  $("#install-btn").hidden = false;
});
$("#install-btn").addEventListener("click", async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  $("#install-btn").hidden = true;
});
addEventListener("appinstalled", () => { $("#install-btn").hidden = true; });

/* ── Service worker ──────────────────────────────────────────────── */
if ("serviceWorker" in navigator) {
  addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("sw.js");
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            $("#update-toast").hidden = false;
            $("#reload-btn").onclick = () => { sw.postMessage("skip-waiting"); };
          }
        });
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        location.reload();
      });
    } catch { /* app still works without offline support */ }
  });
}

boot();
