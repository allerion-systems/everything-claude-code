# Second Brain Entry — 2026-10-04
Scheduled research run: edge data centers, solar roofing, battery architecture, fluorspar in fusion.

> Status: **conceptual / desk research from model knowledge, no live literature search this run.**
> Numbers marked (~) are order-of-magnitude and must be verified before any external use.
> Concepts below are invention *directions*, not validated designs, and are not patent-searched.

---

## 0. Evolve log (what to carry forward)

- No prior second-brain location existed in the repos; this folder (`docs/second-brain/`) is the new home. One dated file per run + this index of open threads.
- Cross-repo link worth keeping: **Allerion-Digital-Twin** (Hardin County, IL) sits in the Illinois–Kentucky fluorspar district and next to Hicks Dome (REE, fluorspar, Be, Li-bearing hints). Section 4 ties fluorspar-for-fusion directly to that asset. Reminder from that repo: Hicks Dome is ADJACENT, not on-property.
- Open threads for next run: (1) verify FLiBe/Be supply numbers, (2) literature search on perovskite-silicon tandem durability, (3) draft the edge-DC canvas as a diagram artifact, (4) patent-landscape check on structural PV roofing.

---

## 1. Modular zero-emission data centers at the edge — conceptual canvas

### 1.1 Problem framing
Edge compute (inference, CDN, industrial/construction digital twins) needs 50 kW–2 MW sites close to users, often on weak grid. "Zero emission" must cover operational carbon (power), water (WUE→0), and refrigerant GWP.

### 1.2 Canvas (Lean-canvas style, engineering version)

| Block | Concept |
|---|---|
| **Pod** | 40 ft ISO-footprint, prefab, 250 kW–1 MW IT. Liquid-cooled racks (direct-to-chip), 40–50 °C return water. |
| **Power** | Layered: PV (roof/carport) → on-site LFP/sodium-ion storage → grid/microgrid tie → optional hydrogen fuel cell or small geothermal for firm backup. No diesel. |
| **Cooling** | Closed-loop liquid, dry coolers (no evaporative water). Warm-water return enables heat reuse. Immersion as option for dense GPU pods. |
| **Heat as product** | Sell 40–55 °C heat to greenhouses, district loops, aquaculture, laundry, or sorption chillers. Turns waste into revenue and improves carbon accounting. |
| **Network** | Dual diverse fiber, optional LEO satellite + fixed wireless failover. EVPN-VXLAN fabric in pod, BGP to upstream, anycast service IPs across pods. |
| **Control** | Carbon- and price-aware scheduler: shift deferrable batch load to solar hours; thermal+battery as flexible load for grid services. |
| **Build** | Factory-built, crane-set, 8–12 week deployment; foundation = screw piles/ballast, no concrete pour. |
| **Siting** | Substation-adjacent, stranded renewables, brownfield/mine sites, telecom tower yards. |
| **Revenue** | Compute-as-a-service, heat sales, grid flexibility payments, renewable credits. |
| **Risks** | Interconnect queues, permitting, heat-offtake mismatch, fiber cost, physical security, solar-only energy not covering 24/7 load. |

### 1.3 Design rules of thumb
- Target PUE ≤ 1.15 with liquid cooling; WUE = 0 L/kWh via dry cooling (accept ~5–10% higher fan/pump energy in hot climates).
- Solar rarely covers a data center alone: a 1 MW IT pod at ~1.15 PUE draws ~10 GWh/yr (~); that needs roughly 5–8 MWp of PV at mid-latitudes (~), far more than a pod roof. So: roof PV = offset + resilience, not full supply. Pair with PPA/grid or firm clean power.
- Battery sizing: 1–4 h for ride-through + arbitrage; long-duration via H2 or thermal if islanded.
- Mesh of pods: treat as a fleet, with workload mobility (Kubernetes + carbon-aware scheduling), so any single pod outage or power shortfall is absorbed.

### 1.4 Networking study plan (becoming expert)
1. Fabric: leaf-spine, EVPN-VXLAN, ECMP, 400G optics; RoCEv2/PFC/ECN tuning for AI pods.
2. Edge WAN: BGP communities, anycast, SD-WAN vs. native routing, MACsec/WireGuard between pods.
3. Observability: gNMI/OpenConfig streaming telemetry, eBPF host visibility.
4. Resilience: chaos testing of link/power loss; carbon-aware failover policies.
5. Coding exercises: write a small carbon-aware scheduler (Python), a BGP route-policy linter, and an eBPF flow exporter.

---

## 2. Roofing that *is* solar — "Structural PV Roofing" concept

### 2.1 State of the art to beat
Tesla Solar Roof, GAF Timberline Solar, building-integrated PV (BIPV) tiles. Pain points: cost, install labor (two trades: roofer + electrician), thermal derating, repair difficulty, penetration/leak risk, fire classification.

### 2.2 Concept: **Interlocking Monolithic Solar Shingle ("SolarLap")**
- **Cell stack:** perovskite-on-silicon tandem or thin-film (CIGS/CdTe) on a flexible substrate; encapsulated between a fluoropolymer front sheet (ETFE-type, self-cleaning, UV-stable) and a glass-fiber-reinforced composite back sheet. *(Fluorine again: ETFE/PVDF are fluorspar-derived — see §4.)*
- **Shingle geometry:** large-format (~1 m × 0.4 m) shingle with a shiplap/overlap edge. Overlap region carries the water-shedding, non-active strip; the active area is the exposed field. Cells wired in a way that tolerates partial shading (bypass diodes per sub-string).
- **Zero-wiring-on-site idea:** each shingle has integrated **pass-through busbar pads on the overlap**. Laying the next course physically mates contacts (spring/blade), forming the series-parallel string automatically. Installer nails/clips shingles like normal roofing; electrical connection is mechanical. Only home-run connection at ridge/eave junction box.
- **Thermal:** ventilated batten gap under shingles (counter-batten) to reduce cell temperature; optional phase-change layer to flatten peaks. Every +1 °C costs ~0.3–0.4%/°C in silicon output (~).
- **Safety:** module-level rapid shutdown electronics at the string-segment level (compliance with NEC 690.12 style requirements); Class A fire target via mineral-wool/fire-barrier underlayment.
- **Repair:** shingle-level replacement via a "hot-swap" interlock that releases only upward-lifting with a tool.
- **Data:** per-segment telemetry (current/temperature) over power-line comms to detect leaks (insulation resistance drops) before they become structural water damage — a roofing + monitoring product.

### 2.3 Why it could win
Single-trade install, lower BOS cost, aesthetic parity with asphalt shingle, early water-intrusion sensing. Targets the data-center pods above (roof PV that is also the weather skin).

### 2.4 Key risks / unknowns
Perovskite stability (moisture, ion migration; requires hermetic edge seals), hail impact rating (UL 2218 Class 4 / IEC 61215), fire code, shingle thermal cycling of mating contacts, cost per m².

### 2.5 Next steps
Material/stack literature search; mock a shingle in CAD; tie into the HOVER roof-plan agent already in this repo (roof geometry → shingle layout, string design, yield estimate).

---

## 3. A new way of building batteries

### 3.1 Concept: **Structural dry-stack "Bipolar Tape" cells**
Today: electrodes coated on foil, wound or stacked, filled with liquid electrolyte, formation-cycled (formation + aging is a huge share of factory time and floor space).

Proposal combining known threads (bipolar stacking, dry electrode, solid/gel electrolyte, cell-to-structure):

1. **Dry-process electrodes** (solvent-free, PTFE fibrillated binder style — *fluoropolymer again*): removes solvent drying ovens and recovery.
2. **Bipolar current collector** (single conductive sheet, cathode one side, anode other): series connection inside the cell → high voltage per cell, fewer tabs and busbars, lower inactive mass.
3. **Roll-to-roll "tape" with printed gasket seal:** each repeat unit is pre-sealed (laser-welded polymer frame), so the pile is a *pack-level stack* rather than cells in a module.
4. **Quasi-solid / ceramic-polymer composite separator** to prevent bipolar electrolyte ionic shorting between adjacent cells (the classic bipolar challenge), with sealed frames as the second barrier.
5. **Structural integration:** stack compressed between composite plates forming the pod floor / enclosure panel (cell-to-structure), usable in stationary edge containers (weight doesn't matter, cost and safety do).
6. **In-line formation:** formation on the tape line with temporary tab pressure contacts, no separate formation hall.
7. **Chemistry choice for stationary edge:** LFP baseline; sodium-ion (no Li/Co/Ni, good cold performance) as the target for the bipolar tape because voltage per layer is lower, so bipolar stacking recovers system voltage cheaply.

### 3.2 Claimed advantages (to be tested)
Fewer parts (no individual cans, tabs, module busbars), faster manufacturing, lower $/kWh, better thermal path through flat stack faces, repairable by stack section.

### 3.3 Hard problems
Sealing of each unit against creepage, uniform compression across large area, gas/vent management, dendrite/short propagation in a large series stack, QC of thousands of layers.

### 3.4 Experiments
1. Coin-cell → pouch bipolar 3-layer prototype with sodium-ion dry electrodes.
2. Seal leak-test across 500 thermal cycles.
3. Compare $/kWh model vs. conventional LFP module (build a spreadsheet; use the `xlsx` skill).

---

## 4. Fluorspar (CaF₂): all major uses and fusion relevance

### 4.1 Where fluorspar goes today
| Use | Notes |
|---|---|
| **Hydrofluoric acid (acidspar, ≥97% CaF₂)** | Gateway to nearly all fluorochemicals; ~60%+ of demand (~). |
| **Refrigerants / propellants** | HFCs, HFOs (phase-down under Kigali; HFOs growing). |
| **Fluoropolymers** | PTFE, PVDF, FEP, ETFE; battery binders (PVDF), membranes, cable insulation, semiconductor tubing. |
| **Aluminum smelting** | AlF₃ and cryolite flux. |
| **Steelmaking (metspar)** | Flux to lower slag viscosity and remove S/P. |
| **Uranium fuel cycle** | UF₆ for enrichment; fluorine is the carrier. |
| **Lithium-ion** | LiPF₆ electrolyte salt, PVDF binder, fluorinated additives (FEC). |
| **Semiconductors/solar** | HF etch, NF₃/CF₄ plasma cleaning and etching, PV fluoropolymer backsheets. |
| **Pharma/agro** | ~20–30% of drugs and many agrochemicals contain fluorine (~). |
| **Optics** | Single-crystal CaF₂ windows/lenses, UV (excimer laser/lithography) and IR transparency. |
| **Glass/ceramics/enamel, cement, welding rods** | Opacifier, flux, mineralizer. |
| **Water fluoridation** | Fluorosilicic acid (phosphate by-product) mainly, not directly spar. |
| **Dosimetry/detection** | CaF₂:Dy/Mn thermoluminescent dosimeters; CaF₂(Eu) scintillators. |

Supply context: China, Mexico, Mongolia, South Africa dominate; the US has no meaningful current mine output, and fluorspar is on the US critical minerals list. Illinois–Kentucky district historically US-leading. A domestic restart is strategically interesting.

### 4.2 Fusion: where fluorine actually matters
Important correction up front: **fluorspar is not a fusion fuel.** Its role is as the feedstock for fluorine-bearing materials and salts used around the plasma.

1. **Molten-salt breeding blankets (FLiBe = 2LiF·BeF₂).**
   - Roles: tritium breeder (Li), neutron multiplier (Be), coolant, and heat-transfer fluid in one liquid. Liquid → no radiation-damage lattice problem, online tritium extraction, high-temperature operation at low pressure.
   - Design lineage: MSRE (fission), ARC / MIT compact tokamak study, Kyoto-FFHR/Helical designs, UCLA/ORNL concept studies, and startups exploring FLiBe immersion blankets.
   - Fluorine source: fluorspar → HF → LiF / BeF₂. LiF needs **Li-6 enrichment** (natural ~7.5% Li-6; blankets target higher) — a separate bottleneck.
2. **FLiNaK / other fluoride salts** for intermediate coolant loops and as test media.
3. **Tritium chemistry challenge — TF, not T₂.** In FLiBe, tritium appears as corrosive TF unless redox-controlled (Be metal addition keeps it as T₂). Redox control + permeation barriers are active research; fluoride-resistant materials (Ni alloys, SiC, tungsten) required.
4. **Fluorine neutronics penalties.** F-19 reactions: (n,α) → N-16 (short-lived, ~7 s, high-energy gamma 6–7 MeV) and (n,2n)/(n,γ) channels. Shielding and activation analysis needed; this is a design cost for fluoride salts, offset by chemistry benefits.
5. **Beryllium** is the other limiting input (toxic, scarce; also found in Spor Mountain-type deposits and associated with fluorspar districts, notably the Hicks Dome / Illinois–Kentucky and Utah systems). Alternative multipliers: Pb (in PbLi), Be-free salts with lead.
6. **Optical windows and diagnostics:** CaF₂ and MgF₂ windows for VUV/UV plasma diagnostics; fluoride glasses for IR.
7. **Fluoropolymers & seals** in cryo/vacuum subsystems (limited by radiation: PTFE degrades under neutron/gamma dose, so used outside high-dose zones).
8. **Tritium handling:** HF/F₂-based or fluoride-based processes in isotope separation and fuel-cycle chemistry; LiF dosimetry for tritium/neutron monitoring.
9. **Magnet-adjacent:** high-temperature superconductor tapes use fluorine-free or TFA-MOD (trifluoroacetate) chemical routes for REBCO precursor films — another indirect fluorspar link.
10. **Inertial fusion (ICF):** CaF₂/LiF components in laser optics, hohlraum/diagnostic filters; FLiBe liquid wall (HYLIFE-II concept) to protect first wall.

### 4.3 Strategic synthesis (links to Allerion assets)
- A US fusion industry using FLiBe or fluoride salts implies new *domestic demand* for high-purity LiF, BeF₂, and enriched Li-6, all rooted in acid-grade fluorspar + lithium + beryllium.
- The Illinois–Kentucky fluorspar district (Hardin County) is the logical US feedstock region; Hicks Dome's geology is associated with fluorspar, REE, and Be-bearing minerals (treat as adjacent to the site; REE below 310 ft remains inferred per project rules).
- Candidate thesis for the Allerion pitch: *"Domestic fluorine and critical-mineral chain for fusion salts and battery binders,"* then quantify demand, which is currently tiny versus HF demand, so fusion is a long-dated option, not a near-term market.
- Honest caveat: FLiBe is one of several blanket concepts; many designs prefer PbLi or solid ceramic breeders, so fluorspar-for-fusion is a plausible but not guaranteed demand pull.

### 4.4 Research to do next
Quantify tonnes of LiF/BeF₂ for a 1 GWe plant (blanket volume × density), compare to world BeF₂ production; survey tritium-permeation data in FLiBe; get current USGS fluorspar and Be statistics.

---

## 5. Self-evolution notes for the toolchain
- Add a `/second-brain` command or skill that appends a dated entry here and updates this index — candidate for the continuous-learning-v2 spec.
- Add a skill, `edge-datacenter-design`, capturing the canvas in §1 as a reusable checklist.
- Everything above should be re-validated against live sources before leaving this repo.
