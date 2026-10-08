# Second Brain — R&D Concepts (2026-10-08)

Status: conceptual. Invented ideas are hypotheses, not validated designs. Sourced facts are marked [S]; my own estimates are marked [E].

## 1. Fluorspar (CaF2): uses and fusion relevance

### Uses [S: USGS critical minerals list 2025; Louisville Public Media 2026-04-08; Metal Tech News 2026-08]
- Metallurgy: flux in steel, aluminum (cryolite/AlF3).
- HF chain (acid-grade, >97% CaF2 + H2SO4 -> HF): refrigerants, fluoropolymers, semiconductor etchants, Li-ion electrolyte (LiPF6), uranium conversion (UF6), solar cells, pharma, SF6 switchgear.
- Supply: ~10 Mt world 2025, China ~6 Mt; US 100% net import reliant. DLA acid-grade contract up to $250M (late 2025).
- Domestic: Illinois-Kentucky Fluorspar District (Hardin/Pope Co., IL) is the main US deposit. Relevant to Allerion Digital Twin site context; Hicks Dome stays labeled ADJACENT per project rules.

### Fusion link
| Pathway | Role | Fluorspar dependence |
|---|---|---|
| FLiBe (2LiF-BeF2) blanket/coolant | Breeds tritium (Li-6), Be multiplies neutrons, carries heat | Fluorine ~77 wt% of salt [E] -> HF -> fluoride salts |
| FLiNaK / other fluoride salts | Intermediate coolant, heat transport | Same HF chain |
| Enrichment/fuel-cycle chemistry | UF6 for fission-fusion hybrids, tritium extraction as HT/HF handling | Indirect |
| Structural/plasma-facing | Fluoride-based processing of W, Be | Minor |

Findings:
- Fluorine is commodity-scale; **beryllium and Li-6 enrichment are the real bottlenecks** (Kyoto Fusioneering/NGK FLiBe effort cites Be handling as the hard part).
- No public estimate found for fusion-plant fluorine inventory. Open item: compute inventory = salt volume x density x F fraction for an ARC-class blanket (order tens to hundreds of tonnes F per plant [E, unverified]) — small vs. 10 Mt/yr fluorspar. Conclusion [E]: fusion will not strain fluorspar volume; it competes on purity/HF-grade and on Be/Li-6, not CaF2 tonnage.
- Idea: **dedicated nuclear-grade HF/LiF supply chain** from domestic IKFD fluorspar -> strategic angle for Allerion.

## 2. Modular zero-emission edge data center (conceptual canvas)

Landscape [S: DCD/ESG Today/Hoodline 2026-07]: EdgeCloudLink runs 1 MW H2 fuel-cell modules (PowerCell PS190 ~225 kW units), water byproduct reused for cooling, liquid + rear-door HX, claimed PUE 1.05 (company claims).

Concept "EDGE-Z" (canvas blocks):
1. **Shell**: 40 ft container / 3D-printed or CLT shell; roof = PV skin (see §3).
2. **Power**: PV roof + sodium-ion/LFP battery (§4) + electrolyzer-less H2 fuel cell *as long-duration backup only* (hydrogen trucked or on-site electrolysis with surplus PV). Grid as optional island-able tie.
3. **Cooling**: direct-to-chip liquid loop -> heat exchanger -> (a) reuse for greenhouse/district heat, (b) fuel-cell product water topping up closed loop. Target zero potable-water draw.
4. **Compute**: 100-500 kW, GPU inference at edge; immersion optional.
5. **Network**: dual-uplink (fiber + LEO/5G), BGP anycast between sites, WireGuard mesh overlay, local SD-WAN controller; sites announce capacity to a scheduler (carbon- and heat-demand-aware job placement).
6. **Control plane**: digital twin of each module (ties into Allerion Digital Twin stack), predictive thermal/power model, demand-response to battery SoC.
7. **Siting logic**: co-locate with heat sinks (greenhouses, aquaculture, mine/quarry sites) and stranded renewables.

Open questions: real emissions of trucked H2; PV yield vs. container footprint (a 40 ft roof ≈ 30 m² -> ~6 kWp, i.e. <2% of a 300 kW load [E]) — **so roof PV alone cannot power the module; PV is supplemental, site-level arrays or wind needed.** Honest framing matters.

## 3. Roofing that is solar: "SolarShingle-Z" concept

Prior art exists (Tesla/SunTegra/GAF Timberline Solar, perovskite-on-glass tiles, CIGS roofing membranes), so novelty must come from the material/assembly:
- **Concept**: interlocking recycled-glass-ceramic tile with a laminated perovskite/silicon-heterojunction tandem cell (target >24% module) and edge-integrated busbar that doubles as the drainage/overlap channel, so electrical and weather joint are one feature.
- **Passive features**: radiative-cooling top coat (lowers cell temp, +1-3% yield [E]); hydrophobic self-cleaning nanocoating; tile-level microinverter/DC optimizer in the tile head-lap.
- **Fastening**: plug-in tool-less tile-to-tile connectors (roofers install it like slate, electrician only does home-run).
- **Risks**: perovskite stability (encapsulation, lead), fire rating (UL 790 Class A), hail (UL 61730 / FM 4473), repairability. Silicon-only variant is the near-term path.

## 4. New battery build method: "Dry-stack monolithic cell" concept

Constraints: manufacturing cost/footprint is dominated by electrode coating+drying, formation, and NMP solvent.
- **Concept**: solvent-free dry-film electrodes + **co-extruded solid/gel separator-electrode laminate**, built by roll-to-roll hot calendering, then **structural pack**: cells laminated directly into load-bearing panels (cell-to-chassis / cell-to-roof-wall) so the battery doubles as enclosure.
- **Chemistry for edge DC**: sodium-ion or LFP (no Co/Ni), long cycle life, safe thermal profile; fluoride-containing binders (PVDF/PTFE) and LiPF6/NaPF6 tie back to the fluorspar chain -> note PFAS-free binder research (e.g., water-based, PTFE-free dry processes) as a risk/opportunity.
- **Novel angle**: in-line **formation-free** pre-lithiated/pre-sodiated anodes plus ultrasonic welding of tabs, cutting formation time (largest capex/time sink) — needs lab validation.
- Prior art: Tesla/Maxwell dry electrode, 24M SemiSolid, CATL cell-to-pack. Treat as a design direction, not a claim of novelty.

## 5. Coding/networking expertise log (self-evolution)
- Skill ideas for this repo: `edge-datacenter-design` (power/thermal/network checklist), `fluorine-supply-chain` (research template), `battery-process-screening` (rubric). Not yet created — candidates for a future PR.
- Networking study targets: BGP anycast for edge, WireGuard mesh, EVPN-VXLAN, SRv6, carbon-aware scheduling.

## 6. Open items
1. Compute fusion plant fluorine inventory (needs ARC/STEP blanket volume).
2. Verify EdgeCloudLink 2026 claims against primary DCD reporting.
3. Pull USGS MCS 2026 fluorspar numbers.
4. Prototype a thermal/power sizing script for EDGE-Z.

## Sources
- https://www.neimagazine.com/news/japan-partners-target-fusion-salt-supply/
- https://www.metaltechnews.com/story/2026/08/24/critical-minerals-alliances-2026/fluorspar-reliance-reaches-beyond-the-mine/2907.html
- https://www.lpm.org/news/2026-04-08/fluorspar-put-crittenden-co-on-the-map-100-years-ago-ai-tech-drives-interest-anew
- https://pubs.usgs.gov/pp/1802/g/pp1802g.pdf
- https://www.datacenterdynamics.com/en/news/ecl-announces-3d-printed-hydrogen-powered-off-grid-data-centers
- https://www.esgtoday.com/ecl-raises-7-million-to-build-zero-emissions-green-hydrogen-powered-data-center/
- https://hoodline.com/2026/07/hydrogen-hustle-ecl-taps-powercell-to-juice-santa-clara-data-center-boom/
