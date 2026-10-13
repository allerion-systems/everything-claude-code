# Frontier Concepts Brief — 2026-10-13

Automated scheduled run. **Concepts below are speculative design sketches, not validated engineering.** Sourced facts are marked with links; everything else is hypothesis to test.

## 1. Modular zero-emission edge data centers (canvas seed)

**Grounding (sourced):** Prefabricated immersion-cooled modules exist (LiquidStack MicroModular/MegaModular, 250 kW–1.5 MW, PUE ~1.02 claimed) — [DRJ](https://drj.com/industry_news/liquidstack-brings-liquid-immersion-cooling-to-the-edge-with-the-release-of-new-micromodular-and-megamodular-turnkey-data-center-solutions/). HPE/Danfoss offer a heat-recovery module for edge DCs — [Danfoss](https://danfoss.com/en/about-danfoss/news/dcs/hewlett-packard-enterprise-and-danfoss-partner-to-curb-data-center-energy-consumption-and-reuse-excess-heat). No found product integrates on-site solar + storage + heat reuse as one "zero-emission" unit (search gap).

**Concept canvas — "Heat-Positive Edge Pod":**
- Enclosure: 40 ft container footprint, immersion tanks + dry cooler; roof = PV (see §2).
- Power: PV + sodium-ion/LFP storage (§3) + grid tie as backstop; target ≥70% on-site annual energy.
- Heat: 45–60 °C return loop to a co-located consumer (greenhouse, district loop, laundry, aquaculture). Heat-pump lift only if consumer needs >60 °C.
- Siting logic: place pods where *heat demand + solar + fiber* coincide (e.g., greenhouses, wastewater plants, industrial parks).
- Control plane: workload scheduler shifts deferrable inference/batch to PV peaks; thermal storage buffers heat.
- Open questions: realistic PV area vs. kW IT load (roof alone covers only a small fraction at 250 kW+; needs adjacent array), water-free heat rejection in hot climates, permitting.

**Networking/coding learning track:** BGP/anycast for edge, EVPN-VXLAN fabrics, SRv6, RDMA/RoCE congestion control, Redfish/OpenBMC telemetry, Rust/Go for control-plane services.

## 2. Roofing that is solar (concept: "SolarSlate")

**Grounding:** Perovskite and back-contact roof tiles are being shown commercially (Gain Solar at Intersolar Europe 2026) — [TaiyangNews](https://taiyangnews.info/technology/gain-solar-showcases-bipv-portfolio-with-roof-tile-pv-glass-solutions); no durability/price data found.

**Concept:**
- Interlocking tile, shingle-like overlap so *water-shedding is mechanical, electrical is layered underneath* (decouples roofing warranty from cell life).
- Replaceable cell cassette snaps into a permanent polymer/stone-coated base tile; swap cassettes at 15–20 yr without re-roofing.
- Perovskite-on-silicon tandem cassette; edge-sealed glass-glass; colored via interference coating (dark slate look) accepting ~10–15% loss.
- Pass-through plug-in connectors in the overlap (no roof penetrations), microinverter per row; hail/fire (UL 790, ASTM E108), wind (ASTM D3161/D7158) targets.
- Key risks: perovskite stability under heat/humidity, connector ingress, cost vs. shingle + panels.

## 3. New way of building batteries

**Grounding:** Dry-electrode now in production at Tesla 4680 (per Feb 2026 reporting); LiCAP claims ~40% energy and up to 50% cost reduction (unvalidated); LG ES all-solid-state dry-electrode pilot line planned H2 2026; lab dry sodium-ion electrodes reported — summarized via [SMM](https://news.metal.com/en/newscontent/104036774-solid-state-battery-lg-energy-solution-turned-profitable-in-q2-h2-to-launch-all-solid-state-dry-electrode-pilot-line2), [Nature Comms (Dec 2025)](https://doaj.org/article/213bb1b486b04483a2cc718996e64e5c), [Fraunhofer PRONTO](https://www.ise.fraunhofer.de/en/research-projects/pronto.html).

**Concept — "Printed-in-place stationary pack" (for edge DC storage):**
- Sodium-ion dry-processed electrodes (no NMP, no Co/Ni/Li) for 2–4 h stationary duty where energy density matters less.
- Cell-to-enclosure: electrodes stacked directly in the cabinet's immersion-compatible housing (dielectric-fluid-safe), eliminating module/pack layers.
- Thermal co-design: battery shares the pod's liquid loop.
- Test plan: cycle life at 45 °C, fire propagation, cost/kWh vs. LFP.

## 4. Fluorspar (CaF2) uses and fusion

**Established uses (general knowledge):** HF production (→ fluorochemicals, refrigerants, PTFE, lithium-battery electrolytes LiPF6/PVDF), steel and aluminum fluxing/cryolite, glass/enamel/ceramics, optical-grade CaF2 (UV lithography lenses), uranium hexafluoride for enrichment. Fluorspar is a US/EU critical mineral (relevant to the Hardin County, IL district, where the Allerion digital twin is sited — verify specifics from project data).

**Fusion relevance:**
- FLiBe (LiF–BeF2) molten salt is a candidate breeder/coolant that can handle tritium breeding, neutron multiplication, and heat removal — see [ANS Fusion Science & Technology](https://www.ans.org/pubs/journals/fst/article-60116) and [Breeding blanket overview](https://en.wikipedia.org/wiki/Breeding_blanket); the MIT ARC concept used it. Beryllium toxicity drives alternatives such as LiCl–LiF.
- Fluorspar → HF → fluoride salts is the supply chain for such salts (this link is inferred; not confirmed in the retrieved sources).
- Also: UF6 enrichment for fission, fluoride-salt fission reactors (FHR/MSR) sharing salt-chemistry with fusion blankets, and tritium-compatible fluoride handling.
- Research gaps: isotopically enriched Li-7 supply for FLiBe, salt purity/redox control, corrosion of structural alloys.

## Next steps
1. Validate PV area vs. IT load numbers for the pod; build a spreadsheet model.
2. Literature pass on perovskite tandem outdoor stability and cassette-style BIPV.
3. Quantify Hardin County fluorspar resource ties to the digital twin (respect ADJACENT labeling rules).
