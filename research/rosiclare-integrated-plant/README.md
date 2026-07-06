# Rosiclare Integrated Fluorspar–Biochar–Energy Plant: 20 Candidate Patentable Concepts

**A technology-landscape and invention-opportunity dossier for a 40-acre integrated industrial site in Rosiclare, Illinois (Hardin County, historic Illinois–Kentucky Fluorspar District).**

> **What this is.** A founder-facing R&D and patent-strategy dossier produced by a fan-out research fleet (8 domain-research agents → 5 invention-generation agents → 1 portfolio curator → 21 adversarial prior-art verifiers; ~2.3M tokens, 376 web/patent searches). Each concept below was generated *grounded in cited literature*, then handed to a separate agent whose only job was to **refute its novelty** by hunting for the closest patents, products, and papers. The "surviving claim angle" for each concept is what was left standing after that attack.
>
> **What this is NOT.** This is not legal advice, not a freedom-to-operate (FTO) opinion, and not a novelty search of record. Patent novelty and non-obviousness are ultimately determined by a registered patent attorney/agent and a USPTO examiner working from a professional search (including non-English — Chinese-language — patent literature, which our web searches could only partially reach). Treat every "white space" claim as a **hypothesis to be confirmed by counsel**, not a conclusion. See [CAVEATS](#caveats--how-to-use-this-honestly).

---

## TL;DR

- **The honest headline:** almost every *individual unit operation* in this space is already patented or published. Of 21 verified concepts, **3 came back "LIKELY NOVEL ANGLE EXISTS"** and **18 came back "CROWDED — NEEDS NARROWING."** None came back "anticipated/dead," and none came back a clean "strong white space." That is a realistic result for a mature field (fluorspar flotation, HF, activated carbon, and biochar are each 50–100-year-old arts).
- **Where the real patentable value is:** not in any single process, but in the **cross-stream couplings that only a co-located fluorspar + biochar + energy site can practice** — using pyrolysis co-products (wood vinegar, biochar, syngas heat, flue-gas CO₂) *inside* the fluorspar/fluorochemical circuits, and closing fluoride/carbon/water loops across the fence line. These "system" and "closed-loop" claims are harder for competitors to design around *and* harder to infringe without replicating your whole site.
- **Your three strongest starting points** (highest novelty verdicts): **#11** fluorspar-tailings-amended carbon-negative biochar soil conditioner, **#14** counter-gradient thermal backbone firing an HF kiln from biomass-pyrolysis exhaust, and **#16** HF-kiln + hot-anhydrite waste-heat recovery for adaptive feedstock drying.
- **Two genuine composition-of-matter candidates** (the most valuable claim type): **#07** gradient semi-ionic fluorinated biocarbon (CF_x) cathode and **#20** fluorite-seeded activated-biochar crystallization media.
- **The single biggest external threat** across the fluorochemical concepts is the **Oxford/FluoRok mechanochemical HF-free estate** (EP4452857A1 + unpublished 2024–25 priority filings) — do an FTO review there before committing to concepts #03/#04.

---

## Site & strategic context (why Rosiclare)

Rosiclare sits in Hardin County, Illinois — the heart of the Illinois–Kentucky Fluorspar District (IKFD), which supplied **>90% of US fluorspar at its peak** and produced ~12.5 Mt of refined fluorspar since the 1800s. Fluorite is Illinois' official state mineral. The site advantages that make this portfolio coherent:

| Advantage | Detail | Source |
|---|---|---|
| **Legacy tailings/gob feedstock** | >125 years of district tailings; Minerva No. 1 ore was milled *at Rosiclare* until Jan 1996. Tailings are metal-bearing (ATSDR found Ba, Cd, Pb above comparison values at Minerva No. 1) — a liability that several concepts convert into feedstock. | [ATSDR Minerva No. 1](https://www.atsdr.cdc.gov/HAC/pha/MinervaMine1/MinervaMineHC050407.pdf); [ISGS Circular 604](https://ilmineswiki.web.illinois.edu/wiki/Circular_604/Production_History) |
| **Only current US fluorspar activity is next door** | The *only* 2024 US fluorspar sales came from Cave-In-Rock, IL (Hardin County) — byproduct stockpiles from Hastie Mining's limestone quarry. | [USGS MCS 2025 Fluorspar](https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-fluorspar.pdf) |
| **Critical-mineral tailwind** | Fluorspar is on the 2025 US Critical Minerals List with **100% net import reliance every year 2020–2024** (2024 imports ~440 kt; sources Mexico 62%, Vietnam 14%, S. Africa 9%, China 8%). No government stockpile. | [USGS MCS 2025](https://pubs.usgs.gov/periodicals/mcs2025/mcs2025-fluorspar.pdf); [USGS 2025 list](https://www.usgs.gov/news/science-snippet/interior-department-releases-final-2025-list-critical-minerals) |
| **No indigenous US LiPF₆ / limited US HF** | US HF is made only in LA and TX; the only US LiPF₆ project is Koura's (Kanto Denka-licensed) Louisiana plant. Domestic electrolyte-salt process IP is a stated gap. | [Koura LiPF₆](https://www.kouraglobal.com/north-american-lithium-ion-battery-supply-chain-boosted-through-localization-of-lithium-hexafluorophosphate-lipf6-production/) |
| **Ohio River barge access** | Smithland-pool Ohio River access reaches EAF mills and Gulf markets at bulk freight rates — relevant to the heavy metspar/briquette products (#18). | site brief |
| **Hardwood residue** | Southern Illinois / Shawnee-region hardwood sawmill residue arrives green (35–50% moisture) — the feedstock for the biochar pillar and the reason the waste-heat-drying concepts (#09/#16) have value. | site brief |
| **Critical-minerals R&D already de-risking the ground** | USGS Earth MRI + ISGS/KGS programs are actively characterizing IKFD tailings and Hicks Dome (REE, Y, F, Ba, Nb, Be) next door. | [ISGS critical minerals](https://isgs.illinois.edu/research/critical-minerals/); [KGS Phase I](https://www.uky.edu/KGS/news/2022_critical_mineral.php) |

Full site brief: [`appendix-briefs/site-rosiclare.md`](appendix-briefs/site-rosiclare.md).

## Regulatory context (design constraints, not legal advice)

- **HF is the dominant hazard and permitting driver.** Anhydrous HF is an EPA Risk Management Program (RMP) regulated substance (40 CFR 68) and triggers OSHA Process Safety Management (29 CFR 1910.119) above threshold quantities; multiple CSB investigations at Honeywell Geismar underscore the release-consequence severity. Co-locating combustible-dust/syngas pyrolysis next to an RMP-covered HF process **raises permitting scrutiny** — which is exactly why the "HF-free" routes (#03/#04) and the safety-prioritized microgrid (#17) and low-NOx MRV controller (#13) have strategic value as *siting enablers*, not just products.
- **Air permitting:** HF is a Clean Air Act HAP; both the acid plant and pyrolysis/thermal-oxidizer units need Illinois EPA air permits (NSPS/NESHAP applicability analysis required). AP-42 §8.7 governs fluorspar+H₂SO₄ HF scrubber controls.
- **Tailings reprocessing:** likely falls under the RCRA Bevill exclusion for mining/mineral-processing wastes, but *reprocessing* legacy tailings and the disposition of new rejects (e.g., the #19 cap) must be confirmed with Illinois IDNR Office of Mines and Minerals and Illinois EPA.
- **Fluoride in water:** EPA MCL for fluoride is 4.0 mg/L (WHO guideline 1.5 mg/L) — the target spec for the defluoridation media (#12, #20) and tailings-cap leachate (#19).

Full regulatory brief: [`appendix-briefs/regulatory.md`](appendix-briefs/regulatory.md).

---

## How to read each concept

Each of the 20 concepts below is presented in a consistent structure:

- **Technical design / molecular structure** — specific enough for an engineer or patent agent to see what is claimed (temperatures, reagents, ratios, composition ranges, structure).
- **Prior-art anchor & closest hits** — what already exists, with patent numbers and URLs.
- **Surviving claim angle** — the narrowest defensible novel core *after* the adversarial refutation pass. **This is the part to take to a patent agent.**
- **Novelty verdict** — one of: `LIKELY NOVEL ANGLE EXISTS` (strongest here) · `CROWDED — NEEDS NARROWING` · (none were `ANTICIPATED`).
- **CPC classes** — candidate classification areas to seed a professional search.
- **Rosiclare advantage** — why this is cheaper/safer/defensible *at this site*.
- **Risk** — the specific obviousness/FTO exposure to clear before filing.

Concepts are grouped by pillar. A priority-tier table is at the [end](#portfolio-strategy--priority-tiers).

---

## Pillar A — Fluorspar beneficiation & tailings reprocessing

### Concept 1 — Legacy Tailings-to-Acidspar Retreat Circuit with XRT Gob Sorting, Ge-Credited Sulfide Pre-Float, and Recirculated-Biochar Water Polish
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** Four-stage retreat of IKFD legacy tailings/gob (feed ~15–40% CaF₂, 1–14% sphalerite, 1–5% galena, barite, calcite): (1) scalp at 6 mm, dual-energy XRT sorter (120–160 kV) rejects quartz/limestone at >90% before grinding; (2) two-stage jig pulls a barite gravity pre-concentrate (SG 4.5 cut); (3) grind middlings to P80 74 µm, sulfide flotation (pH 8.5–9, 50–100 g/t potassium amyl xanthate + 200 g/t CuSO₄) to a **Ge-bearing** sphalerite/galena concentrate (LA-ICP-MS assay gate >150 ppm Ge); (4) fluorite rougher + 5–7 column cleaners with sodium oleate + acidized water glass (AWG, modulus 2.8–3.2) + Al₂(SO₄)₃ at 30–35 °C → ≥97% CaF₂, <1.5% SiO₂, Pb <100 ppm. Process water polished through **Ca-loaded hardwood biochar** beds (capture Ba/Cd/Pb to <0.5 mg/L) and fully recycled; **spent metal-loaded biochar is returned to the sulfide-float feed** so captured metals report to saleable concentrate.

**Closest prior art.** US2407651A (1946, sulfide pre-float then acidspar retreat — 80-year-old district practice); US11478801B2 (jig + sensor sort + AWG flotation to CaF₂ ≥98%); CN102921551B (fluorite flotation from tailings); US10246347B2 (biochar beds removing As/Cd/Pb for water recycle); TOMRA XRT at Koura Las Cuevas (commercial).

**Surviving claim angle.** The **closed-loop sorbent recirculation** — returning Pb/Cd/Ba-loaded biochar from the water-polish beds into the xanthate sulfide-flotation feed so captured metals report to the saleable sulfide concentrate, giving a **zero-discharge system where the sorbent is consumed as flotation feed** rather than landfilled — with the Ge-grade assay gate as a dependent limitation, on a legacy-tailings/gob feed. Draw the claim to that loop, not the four-stage flowsheet per se.

**CPC.** B03D 1/002; B03B 9/06; B07C 5/342; C02F 1/28.
**Rosiclare advantage.** >125 yrs of district tailings within trucking distance; the pyrolysis pillar supplies the biochar sorbent at zero marginal logistics cost.
**Risk.** High KSR-combination exposure — every stage is a conventional unit op on this ore. Confirm no CN-language art on sorbent-to-flotation recycle.

---

### Concept 2 — Pyroligneous-Acid-Acidized Water Glass ("PA-AWG") Depressant for Low-Temperature Fluorite–Calcite Separation
**Verdict: CROWDED — NEEDS NARROWING**

**Design (reagent composition-of-matter + method).** A flotation depressant made by acidifying sodium silicate (modulus 2.2–3.3) with the **aqueous condensate (wood vinegar / pyroligneous acid) from on-site hardwood pyrolysis** instead of mineral acid. The condensate (4–8% acetic, 0.5–2% formic acid, phenolics, fulvic-like oligomers) is dosed at 0.3–0.8 kg/kg silicate to pH 8–9, generating the chemisorbing H₃SiO₄⁻/H₂SiO₄²⁻ species *and* co-delivering fulvic organics that reinforce calcite depression. Composition: 60–85 wt% silicate solids, 10–30 wt% pyroligneous organics (≥40% C2–C4 acids), aged 2–24 h. Method: fluorite flotation at **15–25 °C with no pulp heating**, 0.8–2 kg/t PA-AWG + 85:15–95:5 sodium oleate:naphthenate collector.

**Closest prior art.** Chen et al. *J. Anal. Appl. Pyrolysis* 177 (2024) 106380 — biomass pyrolysis liquid *already shown* as a selective calcite depressant in fluorite–calcite flotation (this is the key refutation); *Minerals Eng.* (2024) pine-pyrolysis-liquid depressant; US11478801B2 (AWG + fulvic + naphthalene sulfonate); *Minerals Eng.* (2019) Al₂(SO₄)₃+AWG; CN111672637A (biomass phenolic calcite inhibitors).

**Surviving claim angle.** No located art uses the pyrolysis condensate *as the acidifying agent for sodium silicate*. The defensible core is the **one-pot reagent composition** (silicate modulus 2.2–3.3 acidified to pH 8–9 with 0.3–0.8 kg/kg hardwood pyroligneous acid, aged 2–24 h, defined 60–85%/10–30% split) tied to the **unheated 15–25 °C** flotation method with the specific oleate:naphthenate blend. The broad "wood vinegar depresses calcite" idea is anticipated (2024 JAAP paper), so claims must confine to the *in-situ acidification chemistry* + quantified composition/aging window.

**CPC.** B03D 1/006; B03D 1/008; B03D 2203/04; C10B 53/02.
**Rosiclare advantage.** Wood vinegar is an unavoidable co-product of the site's pyrolysis train — turns a disposal liability into the flotation circuit's principal modifier with zero reagent freight.
**Risk.** High obviousness: examiner can combine the 2024 pine-pyrolysis paper + standard AWG art. **Unexpected-results data (heating elimination, distinct silica speciation) will be load-bearing.** Search CNIPA for the same group's filings pairing pyrolysis liquid with water glass.

---

### Concept 3 — Continuous Twin-Screw Mechanofluorination of Acidspar to KF/NaF/LiF with Flue-Gas Regeneration of the CaTiO₃ Sequestrant (HF-Free)
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** HF-free conversion of CaF₂ to alkali fluorides. Dried acidspar (≥97% CaF₂, −45 µm) co-fed with KOH/NaOH/LiOH·H₂O and anatase TiO₂ (CaF₂:MOH:TiO₂ = 1:2:~1) into a co-rotating twin-screw extruder (L/D 40–60, barrel 150–250 °C from pyrolysis waste heat, 2–10 min, SME 150–500 kWh/t) → 2 MF + CaTiO₃ (perovskite sequesters Ca to block back-reaction). Hot-water leach recovers KF/NaF (LiF by countercurrent wash). **Second inventive layer:** leach-residue CaTiO₃ is carbonated with CHP flue-gas CO₂ (10–20 bar, 80–150 °C) → CaCO₃ + regenerated TiO₂ recycled to the extruder (≥90% Ti closure), making TiO₂ a **circulating agent** rather than a stoichiometric consumable.

**Closest prior art.** **EP4452857A1 (Oxford/FluoRok) — explicitly discloses twin-screw extrusion for CaF₂ mechanofluorination with KOH/NaOH** (undercuts the extrusion-parameter layer); Schlatzer et al. JACS 147, 6338 (2025) — identical CaF₂+M(OH)+TiO₂→MF+CaTiO₃ ball-mill chemistry (same Oxford group); Science 381, 302 (2023) Fluoromix; Russ. J. Phys. Chem. A 82 (2008) — CaTiO₃+CO₂ carbonation; US4562049/US4552730 — Ti recovery from perovskite.

**Surviving claim angle.** No hit combines **carbonative regeneration** with the fluoride-metathesis loop. Defensible core: a closed-loop process where the CaTiO₃ leach residue is carbonated with CO₂-containing flue gas (10–20 bar/80–150 °C) to CaCO₃ + recycle-grade TiO₂ at ≥90% Ti closure — TiO₂ as circulating agent — optionally with the LiF countercurrent-wash step. **Drop any standalone extrusion-parameter claim** (anticipated by EP4452857A1).

**CPC.** C01D 3/02; C01D 15/04; B01J 19/20; C01F 11/18.
**Rosiclare advantage.** Extruder heat and carbonation CO₂ both free from the pyrolysis/CHP pillar; sited in the only US county with current fluorspar activity.
**Risk.** **High FTO exposure from the Oxford/FluoRok estate** — an unpublished JACS-route priority filing almost certainly exists (may surface through mid-2026). Carbonation-step operability (CaTiO₃ is thermodynamically robust) needs experimental conversion data.

---

## Pillar B — Downstream fluorochemicals & battery fluorides

### Concept 4 — Fully HF-Free Fluorspar-to-LiPF₆ Train via KF Halex PF₅ Generation and Perfluorocarbon-Medium Crystallization
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** End-to-end LiPF₆ with **no anhydrous HF anywhere**. Step 1: KF/LiF from acidspar via the site's mechanofluorination unit (#3). Step 2: PF₅ by solid-phase halex — dried KF (5.0–5.5 mol) + PCl₅ (1 mol) in a heated screw/rotary reactor (120–220 °C, 50–200 mbar, N₂ sweep): 5 KF + PCl₅ → PF₅ + 5 KCl; PF₅ polished over NaF guard beds. Step 3: PF₅ sparged (2–6 bar, 25–60 °C) into LiF suspended in perfluorodecalin/perfluoroheptane → ≥99% LiPF₆, inert-filtered, EMC-washed, vacuum-dried to ≤20 ppm H₂O (continuous loop reactor + inline Karl-Fischer/IC gates). Step 4: KCl byproduct membrane-electrolyzed to KOH (recycled to Step 1) + Cl₂ (→ PCl₃/PCl₅), so F flows CaF₂→KF→PF₅→LiPF₆ and K/Cl circulate internally.

**Closest prior art.** *Ind. Eng. Chem. Res.* 2019 — **already-industrialized HF-free LiPF₆ using CaF₂ as the direct fluorinating agent** (key refutation; a CN family likely exists); US2810629A (1957, PF₅ from PF₃/Cl₂ + CaF₂); WO2019186481A1 (Necsa — LiF+PF₅ in perfluorocarbon, family *ceased 2020 → free to build on*); Science 2023 + JACS 2025 + FluoRok (mechanochemical HF-free fluorspar activation); US20140079619A1 (Honeywell PF₅).

**Surviving claim angle.** No single reference shows the four-step integrated train. Defensible core: the **potassium/chlorine internal recycle loop** — mechanochemically produced (HF-free) KF as the halex agent for PCl₅ in a solids-handling reactor at the recited window, *combined with* membrane electrolysis of KCl back to KOH (for Step 1) and Cl₂ (to regenerate PCl₃/PCl₅). Independent claims on "KF + PCl₅ → PF₅" or "LiPF₆ in perfluorocarbon" alone are anticipated.

**CPC.** C01B 25/455; C01D 15/005; H01M 10/0568; C01B 7/19.
**Rosiclare advantage.** Both fluoride feedstocks originate on-site — **eliminates HF rail transport entirely**, a licensing-grade safety contrast with the Gulf Coast HF corridor. Directly answers the "no indigenous US LiPF₆ process IP" gap.
**Risk.** High KSR exposure (IECR-2019 CaF₂-halex + Necsa + FluoRok all point the same way). **The unlocated Chinese family behind the IECR 2019 process is the top FTO/novelty threat — CNIPA full-text search mandatory before filing.**

### Concept 5 — Syngas-Fired HF Rotary Kiln with Biochar Reductive Arsenic Pre-Roast and Anhydrite–Biochar Co-Product
**Verdict: CROWDED — NEEDS NARROWING**

**Design (integrated 3-unit HF system).** (1) **As pre-roast:** acidspar + 1–3 wt% −100 µm biochar fines roasted 300–450 °C, 20–40 min, mildly reducing (CO/CO₂ 0.2–1), volatilizing As as As₂O₃/As₄O₆ into an activated-carbon-scrubbed off-gas — cutting spar As from ≥50 ppm toward the 10–12 ppm cap and pre-empting the documented 500 ppm-As-spar → 900 ppm-As-HF carryover. (2) **HF reactor:** spar + 1.05–1.10 stoich H₂SO₄/oleum, rotary kiln 200–250 °C, but external firing (~2 GJ/t HF) supplied by **pyrolysis syngas + CHP exhaust**, kiln turndown slaved to pyrolyzer output via a thermal-oil buffer. (3) **Byproduct:** hot anhydrite granulated at 70–90% CaSO₄ + 10–25% biochar + 2–5% K-silicate binder into a sulfate-bearing carbon-sequestering soil amendment.

**Closest prior art.** US5047226A (Bayer — thermal As removal in HF manufacture; concept concedes this); WO2009130224A1/EP2268573A1 (Fluorsid — spar thermal pretreat before H₂SO₄ kiln); US3380819A (carbon/lignite reducing roast to volatilize As); EP1167286B1 (Bayer — zoned indirectly-fired HF kiln with heat integration); NL2034400B1 + US5749936A + US5174972A (biochar/gypsum granules).

**Surviving claim angle.** No single unit op survives. Defensible core: the **closed mass/energy loop** — one on-site pyrolyzer supplying (i) the −100 µm biochar reductant for the 300–450 °C, CO/CO₂ 0.2–1 As pre-roast, (ii) the syngas firing duty with **kiln turndown slaved to pyrolyzer output through a thermal-oil buffer**, and (iii) the biochar fraction of the granulated anhydrite–biochar–K-silicate co-product — with the atmosphere/temperature window and pyrolyzer-slaved control recited together.

**CPC.** C01B 7/191; F27B 7/34; C04B 11/26; C05G 3/00.
**Rosiclare advantage.** Syngas, biochar reductant, AC scrubber media, and waste heat all arise in-fence — a merchant-HF unit with no natural-gas supply or off-site carbon purchases, in a county with existing spar stockpiles.
**Risk.** High KSR exposure (US5047226 + WO2009130224A1 + US3380819A). Surviving claim depends on narrow, easy-to-design-around control-integration limitations that are hard to detect in a competitor's plant.

---

## Pillar C — Battery & energy materials (fluorochemical × biocarbon coupling)

### Concept 6 — Closed-Pore Hardwood Hard-Carbon Anode via Aqueous Fluoride Ash-Leach and CHP-Driven Two-Stage Carbonization
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** Hardwood char (450–600 °C) milled to d50 5–15 µm, demineralized by **dilute (0.5–3 wt%) HF/NH₄HF₂ solution recovered from the fluorochemical plant's scrubber liquor** (25–60 °C, 1–4 h) → ash <0.1 wt%, avoiding the 500–1250 °C gas-phase halogen route of the dominant prior art. Air pre-oxidation 250–300 °C (crosslink → closed pores), secondary carbonization 1200–1400 °C (Ar) in a **syngas-CHP-heated furnace with temperature slaved to CHP output**. Product: d002 0.37–0.40 nm, closed-pore 0.02–0.10 cm³/g, BET <10 m²/g, Na capacity 300–350 mAh/g, ICE >88%. Spent leach limed → CaF₂ recycled to acidspar feed (closed fluoride loop).

**Closest prior art.** **CN116986581B — biomass hard carbon washed with HF (10–30%)** (key refutation of the HF-leach step); CN116177520A (pre-oxidation→acid wash→carbonization on bamboo Na-ion anode); Kuraray US9,508,494 (gas-phase halogen demineralization — the design-around target); WO2005070831A1 + US4,444,740 (CaF₂ closed-loop recovery — standard); PMC10533848 + closed-pore literature (the product specs are extensively published).

**Surviving claim angle.** The only defensible core is **site integration**: demineralizing pyrolysis char with dilute (≤3 wt%) fluoride liquor *recovered from a co-located fluorochemical plant's scrubber*, liming spent leach to CaF₂ returned to acidspar feed, with secondary carbonization **heated by co-located syngas CHP**. Composition-of-matter and generic process-step claims are anticipated.

**CPC.** H01M 4/587; H01M 10/054; C01B 32/05; C10B 53/02.
**Rosiclare advantage.** Shawnee hardwood residue, waste fluoride liquor, and CHP heat all in-fence → a Na-ion anode with near-zero purchased reagents.
**Risk.** CN116986581B + CN116177520A make a strong obviousness combination; the patent collapses to plant-integration claims that are hard to detect/enforce (infringement occurs inside a competitor's fence).

### Concept 7 — Gradient Semi-Ionic Fluorinated Biocarbon (CF_x) Cathode — **Composition of Matter**
**Verdict: CROWDED — NEEDS NARROWING** ⭐ *composition-of-matter candidate*

**Design (molecular structure).** Particulate fluorinated carbon: each particle a hardwood-derived hard-carbon host (d50 2–10 µm, ash ≤0.2 wt%, O ≤2 wt%, optional N+P dopants 0.5–3 wt%), bulk CF_x with x = 0.70–1.05, fluorographite interlayer 0.60–0.72 nm, and a **radial C–F bond-character gradient** — interior predominantly *covalent* C–F (XPS F1s ≈689 eV) for capacity, an outer 5–50 nm shell where 20–45% of C–F bonds are *semi-ionic* (F1s ≈687 eV) for conductivity/rate. Product-by-process backup: closed-pore hard carbon (#6) fluorinated in two stages with 10–20 vol% F₂/N₂ from on-site HF electrolysis — stage 1 at 340–390 °C (covalent core), stage 2 a short 250–300 °C pulse (semi-ionic shell). Target >900 mAh/g, 2.7–3.2 V plateau, >2400 Wh/kg.

**Closest prior art.** US7794880B2/US20110003149A1 (Yazami — particulate CF_x with a radial *F-content* gradient, but conductive region is the core); *J. Mater. Chem. A* 2015 (covalent core + conductive fluorinated-graphene shell); **ACS Appl. Energy Mater. 2021 — plasma converts outer covalent C–F to semi-ionic over a covalent interior** (the closest structural hit, via a *subtractive* route); *2452213920301248* (fluorinated hard carbon, 922.6 mAh/g); US20160133932A1/US10944109 (Schlumberger Li/CF_x).

**Surviving claim angle.** Retreat to the quantified intersection: a particulate CF_x in a **low-ash (≤0.2 wt%), optionally N,P-doped hardwood hard-carbon host**, x = 0.70–1.05, 0.60–0.72 nm interlayer, with a depth-profiled 5–50 nm shell at 20–45% semi-ionic fraction **formed by *additive* two-stage direct F₂ fluorination** (high-T covalent build → low-T semi-ionic pulse) — distinguishing over the prior art's *subtractive* (plasma/photo/thermal defluorination) routes and over Yazami's F-content gradient.

**CPC.** H01M 4/5835; C01B 32/10; H01M 6/16; H01M 4/36.
**Rosiclare advantage.** Uniquely co-locates the two hazardous/expensive inputs — F₂ (from fluorspar-derived HF) and engineered biocarbon — eliminating CF_x's dominant logistics cost.
**Risk.** A product-by-process claim is anticipated if the two-stage product is structurally indistinguishable from defluorinated CF_x. **CNIPA/Espacenet native-language search mandatory** (very active Li/CF_x CN space). >865 mAh/g / >2400 Wh/kg exceeds the F/C=1 theoretical limit → rigorous enablement data required.

### Concept 8 — Nonaqueous Hexafluorophosphate Finishing Train: CaCO₃-Modified Biocarbon HF/H₂O Scavenging with Kiln-Closable Spent Media
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** Purification of crude LiPF₆/NaPF₆: salt dissolved 20–30 wt% in anhydrous EMC/DMC, chilled 0–10 °C, passed through a **layered on-site activated-biocarbon bed** — layer 1 (5–15 wt% nano-CaCO₃) converts free HF to surface CaF₂ (HF ≤30 ppm); layer 2 (high-micropore AC + 3A sieve) trims H₂O ≤10 ppm; layer 3 (acid-washed biocarbon) adsorbs colored organics/metals (≤1 ppm). Insoluble LiF/NaF colloids removed by 0.1 µm sintered-biocarbon depth filtration. Anti-solvent fractional crystallization at −20 to 0 °C → ≥99.95%. **Spent CaF₂-on-carbon media fed directly to the HF rotary kiln** as combined fluoride feed + carbon fuel. NaPF₆ embodiment enables ≥2 M carbonate electrolyte concentrates.

**Closest prior art.** **US9,023,204 B2 (Entegris — layered HF-then-H₂O scavenger beds for nonaqueous LiPF₆ electrolyte)** (anticipates layers 1–2); WO1999040027A1 (Atofina — dissolve/filter LiF before recovery); CN1422807A (activated carbon + cold crystallization of LiPF₆); **US3,976,447 (spent CaF₂ scavenger reused as HF raw material)** + US6,723,139 (fine CaF₂ to HF furnace) (anticipate the kiln loop-closure); Ca-modified biochar defluoridation (aqueous only).

**Surviving claim angle.** Integrated cross-stream system: a **CaCO₃-loaded biogenic-carbon layer** converting HF to surface CaF₂ within a multi-layer biocarbon bed operating in *anhydrous* carbonate solution of LiPF₆/NaPF₆ at 0–10 °C, wherein spent CaF₂-on-carbon media is fed to a sulfuric-acid HF kiln — with dependent claims on the 0.1 µm sintered-biocarbon **NaF-colloid depth filtration enabling ≥2 M NaPF₆ concentrates**.

**CPC.** C01D 15/005; C01B 25/455; B01J 20/20; H01M 10/0568.
**Rosiclare advantage.** Scavenger media made from the site's own AC; consumed media returns as CaF₂ kiln feed → purification consumables cost approaches zero.
**Risk.** Severe §103 (Entegris + Ca-biochar + US3,976,447). Lean on unexpected results in nonaqueous media (HF ≤30 ppm without salt decomposition; NaF-colloid removal unlocking the NaPF₆ solubility cap).

---

## Pillar D — Pyrolysis reactor & engineered-biochar processes

### Concept 9 — Moisture-Adaptive Auger Pyrolyzer with In-Situ Self-Char Tar-Cracking Bed
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** Twin-screw auger reactor, hardwood <15 mm pre-dried by 150–200 °C exhaust recovered from the **CaF₂ calciner + syngas-CHP** to hit <15–20% feed moisture (the thermal-self-sufficiency threshold). Zone-staged 480–550 °C, 10–25 min (slow-pyrolysis, ~45–50% char). Vapors routed through an **integral moving bed of the reactor's own fresh biochar at 600–700 °C** acting as a sacrificial/regenerable tar cracker; cracked carbon is retained as fixed carbon and tar-laden char is screw-returned to the hot zone rather than downgrading product. NIR feed-moisture sensor drives an MPC trimming screw speed + air split to hold FC >75%, H/Corg <0.7.

**Closest prior art.** **US9598641B2 (tar aerosols cracked on fresh hot char → additional charcoal)** (key refutation of the centerpiece); US8100990B2 (auger pyrolysis + biomass dryer + NCG combustion); Gilbert et al. *Biores. Technol.* 2009 (500 °C vapors through 500–800 °C char bed, ~66% tar reduction); EP3358253A1 (twin-screw carbonizer w/ heat recovery); US12428987 + US9890332B2 (sensor-driven residence control; >80% FC target).

**Surviving claim angle.** The **specific closed control-and-recycle loop**: an NIR feed-moisture-driven MPC co-manipulating screw speed + combustion-air split to hold certified biochar setpoints (FC >75%, H/Corg <0.7) while **segregating a sacrificial moving-bed char fraction whose tar-laden portion is screw-returned to the hot zone so the marketable char never contacts condensed tar**. Claim with concrete measured control laws.

**CPC.** C10B 53/02; C10B 57/00; B01J 8/12; G05B 13/04.
**Rosiclare advantage.** Co-located HF/CaF₂ calcination + CHP supply the free 150–200 °C exhaust to dry green Hardin County hardwood.
**Risk.** US9598641B2 is a serious 102/103 threat; combine with US8100990B2 + US12428987 and most of the claim falls. FTO check vs active PYREG patents (US12173236, US9505984).

### Concept 10 — CHP-Sourced CO₂/Steam Activation Loop for On-Site HF-Scrubber Carbon
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** Hot char conveyed directly to an 800–900 °C activation kiln using an activating gas drawn from the **syngas-CHP flue stream (CO₂-rich) + boiler steam** (no purchased reagents), controlled to 40–55% burn-off → BET ~1000–1600 m²/g. Resulting AC deployed in the fluorochemical plant's own HF/SiF₄ scrubber (AP-42 §8.7); loaded carbon thermally regenerated on-site, desorbed fluoride precipitated as CaF₂ → beneficiation. Activation burn-off tied to CHP CO₂ slip-stream flow.

**Closest prior art.** **AU2018377853A1/US11731879B2 (Bygen — activate own char with own combustion flue gas)**; WO2006064320A1 (Foster Wheeler — steam/CO₂ activation in gasifier hot loop); US6451094/US6558454 (EPRI/UIUC — on-site AC for the site's own flue-gas cleaning); US5946342A (integrated char + activation w/ byproduct heat); WO2001064579A1 (HF off-gas → CaF₂).

**Surviving claim angle.** The **CO₂-availability-driven activation controller**: modulate steam:char ratio and burn-off setpoint as a function of measured CHP CO₂ slip-stream flow, with the >1000 m²/g carbon deployed only in the co-located HF/SiF₄ scrubber and regenerated so desorbed fluoride precipitates as CaF₂ back to beneficiation.

**CPC.** C01B 32/318; C01B 32/336; B01D 53/68; B01J 20/20.
**Rosiclare advantage.** The HF plant simultaneously supplies CO₂/steam (via CHP), the captive demand (scrubber media), and the CaF₂ recovery sink.
**Risk.** High §103 (Bygen + EPRI/UIUC + WO2001064579A1). **Enablement risk: plain AC has poor HF capacity** — a working embodiment likely needs impregnation, dragging claims toward existing impregnated-carbon/dry-sorbent art.

### Concept 11 — Fluorspar-Tailings-Amended Carbon-Negative Biochar Soil Conditioner
**Verdict: LIKELY NOVEL ANGLE EXISTS** ⭐ *strongest-tier*

**Design.** Soil-conditioning granule: **CO₂-weathered hardwood biochar (60–80 wt%) + milled fluorspar beneficiation tailings (20–40 wt%: residual CaF₂ + calcite + silicate gangue)**, optionally + basalt/silicate rock dust for enhanced weathering. Carbon fraction held EBC/IBI-compliant (Corg >50%, H/Corg <0.7, O/Corg <0.4); carbonate fraction supplies liming + slow-release Ca; porous biochar accelerates mineral weathering → **additive CO₂ removal** (biochar permanence + carbonate/silicate weathering). Bounded so residual CaF₂ delivers only trace slow-release fluoride below phytotoxic/regulatory soil-F thresholds; claim centers on a defined biochar:tailings:rock-dust ratio window + a **maximum leachable-F specification**.

**Closest prior art.** WO2024186614A1 (WSU CO₂-weathered biochar — covers the CO₂ pre-loading step, aimed at cement not agronomy); **US20160107944A1 (Vale — CaF₂-dominant soil conditioner from F-bearing industrial byproduct)**; Honvault et al. 2024 (biochar + crushed-rock co-application CDR); US9809502B2/US10118870B2 (Cool Planet enhanced/mineral-infused biochar); Xinhai (Ca-rich fluorite tailings as soil conditioner — non-patent).

**Surviving claim angle.** No reference combines **fluorspar beneficiation tailings specifically with CO₂-mineralized, EBC-compliant biochar**. Defensible core: a granulated composition tied to (i) fluorspar-tailings mineralogy at 20–40 wt% with CO₂-weathered EBC biochar, (ii) a **maximum leachable-fluoride specification** verified by a named leach test, (iii) the tailings ratio selected so carbonate/silicate weathering CDR is additive to biochar permanence. The fluoride-release-bounded window is the novel core.

**CPC.** C09K 17/00; C05G 3/00; C01B 32/05; B09B 3/00.
**Rosiclare advantage.** Legacy IKFD tailings and Hardin County hardwood residue both on-site → near-zero feedstock cost for both phases.
**Risk.** Combination exposure (Vale + WO2024186614A1 + basalt/biochar literature); the leachable-F cap must be tied to unexpected data (biochar sorption suppressing F mobility from tailings). FTO on the CO₂-weathering step may require design-around of WO2024186614A1.

### Concept 12 — Ca-La-on-Biochar Defluoridation Media with Closed-Loop Fluoride Recovery
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** High-BET activated hardwood biochar impregnated with a mixed Ca/La (oxy)hydroxide coating — **low La³⁺ loading (3–8 wt%) co-precipitated with Ca from on-site fluorogypsum/CaF₂-tailings-derived lime**, calcined 500–700 °C to fix dispersed La₂O₃/La(OH)₃ high-affinity sites alongside bulk CaO/Ca(OH)₂ domains. Targets fluoride uptake between weak Ca-only media (0.09–0.51 mg F/g) and costly La-only (40–127 mg F/g) at a fraction of La cost. Spent media regenerated with dilute NaOH; eluted fluoride precipitated to CaF₂ → beneficiation. Brings >4 mg/L groundwater below EPA MCL 4.0 / WHO 1.5 mg/L.

**Closest prior art.** CN102059093A/B (Ti-La-AC fluoride adsorbent — La-oxide on porous carbon); **US4717554 (NaOH-regenerate + lime-precipitate eluted F as CaF₂ closed loop)**; US7786038B2 (La-bearing metal-oxide defluoridation); La-sludge biochar 40.3 mg/g + Ca-dairy biochar (separately known); La-Fe/La-Ce/La-Mn bimetal sorbents. **No hit for Ca+La specifically co-loaded on biochar.**

**Surviving claim angle.** The integrated process/system: dispersed low-loading La(OH)₃/La₂O₃ + bulk CaO/Ca(OH)₂ co-precipitated onto high-BET biochar using **lime specifically derived from fluorspar-beneficiation byproducts**, coupled with NaOH regeneration whose eluted fluoride is precipitated as CaF₂ and returned to the on-site beneficiation feed — claim the **Ca-source provenance + mass-balanced closed loop into ore processing**, plus the Ca:La co-domain architecture/loading window.

**CPC.** C02F 1/28; C02F 2101/14; B01J 20/20; B01J 20/3204.
**Rosiclare advantage.** Fluorogypsum/CaF₂ tailings/lime = cheap captive Ca; recovered CaF₂ flows straight back into beneficiation.
**Risk.** Every element separately anticipated; novelty hinges on byproduct-lime provenance, co-domain structure, and demonstrated synergy (capacity beyond additive Ca+La) — needs experimental data.

### Concept 13 — Reactor-Embedded MRV Instrumentation with Closed-Loop NOx and Fixed-Carbon Control
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** Instrumentation on the continuous retort (gravimetric scale + NIR moisture, per-zone thermocouples, off-gas O₂/CO/NOx, residence tracker, char mass counter, inline H/Corg NIR/LIBS proxy). An ML controller predicts NOx and fixed carbon from the temperature/air/moisture trajectory and trims oxidizer + reactor air-split to **simultaneously hold NOx below permit limit AND hold char to EBC/IBI bands**. Each production segment auto-generates Verra VM0044 v1.2 + Isometric Biochar v1.3 records to a tamper-evident MRV log → qualifies char for the CORC premium (~€125–145/t).

**Closest prior art.** US20240296463A1 (dMRV with on-site sensors, tamper-evident records, biochar flowcharts); US8772559B2 (closed-loop char-carbon control via inline sensors); Carbonfuture/PYREG dMRV (200+ reactor sensors → registry, commercial); arXiv 2412.07881 (ML NOx prediction — admitted-known); US20170369785A1 (multi-sensor kiln air control).

**Surviving claim angle.** A **single controller solving a joint constrained optimization** — holding thermal-oxidizer NOx below a permit ceiling *and* char within a specific EBC/IBI window by co-trimming oxidizer + reactor air-split from a shared ML model, and in the same cycle emitting paired VM0044 + Isometric records. The **coupled permit-constraint-plus-char-spec co-optimization objective** is the whitespace (not the sensors/log/NOx-prediction individually).

**CPC.** G05B 13/04; G01N 33/22; C10B 57/00; G06Q 30/018.
**Rosiclare advantage.** Siting pyrolysis next to an RMP HF process raises scrutiny → certified low-NOx control is a siting enabler that also monetizes premium CORCs.
**Risk.** Every constituent element separately anticipated; survival depends on non-obvious synergy in the *joint* optimization — a narrow, contestable inventive step.

---

## Pillar E — Plant-level energy integration

### Concept 14 — Counter-Gradient Thermal Backbone Coupling Biomass Pyrolysis Exhaust to a Multi-Zone HF Sulfation Kiln with Acid-Side Heat Cascade
**Verdict: LIKELY NOVEL ANGLE EXISTS** ⭐ *strongest-tier*

**Design.** A shared thermal-oil/flue-gas backbone where 950–1050 °C FLOX-class combustor exhaust from continuous screw-reactor carbonizers is the **sole indirect firing medium** for a three-zone HF kiln (CaF₂ + H₂SO₄, endothermic, 200–250 °C). Temperature-tiered: 900–650 °C fires kiln zone 1; 650–400 °C fires zones 2–3; 400–180 °C preheats H₂SO₄/oleum to 80–180 °C; 180–90 °C tail gas dries wood chips to <15–20%. Exothermic acid-side heat (oleum absorption) recovered as 4–10 barg steam (MECS-HRS-type) and re-injected. Control valves apportion exhaust between kiln and dryer per kiln zone-1 wall setpoint; supplementary syngas burner trims only when pyrolysis heat is insufficient. Claimed as system + method operating the kiln with **≥80% of indirect firing duty from biomass pyrolysis off-gas**.

**Closest prior art.** EP1167286B1/US6,699,455 (Bayer — 3-zone indirectly-fired HF kiln, acid preheat 80–180 °C, flue-gas reuse — but *fossil-fired*); **US11,753,698/US12,291,760 (Carbon Technology Holdings — pyrolysis off-gas fires endothermic co-located metal-ore reduction)** (closest teaching, but carbothermic reduction, no tiered manifold, no acid integration); US8,100,990B2 (tail-gas feed drying); US9,162,890 (MECS acid heat recovery); US3,718,736 + CN103896215A (externally-fired HF kilns w/ heat conservation).

**Surviving claim angle.** No located reference fires a CaF₂/H₂SO₄ sulfation kiln from biomass-pyrolysis combustor exhaust. Defensible core: the **temperature-tiered exhaust manifold** in which FLOX-class pyrolysis-volatiles combustion supplies ≥80% of the multi-zone HF kiln's indirect firing duty, apportioned between kiln zone-1 setpoint and dryer duty by a control-valve network, with acid-absorption exotherm re-injected mid-tier.

**CPC.** C01B 7/191; C10B 53/02; F27D 17/004; Y02P 20/129.
**Rosiclare advantage.** Both the endothermic sink (CaF₂ sulfation) and exothermic source (residue pyrolysis) natively co-located on one pad, adjoining the only active US fluorspar source.
**Risk.** Primary risk is §103 (EP1167286B1 + Carbon Technology Holdings → routine burner substitution). The dense, partly-unsearchable Chinese HF utility-model corpus may hold closer art.

### Concept 15 — Syngas CHP with Firebrick Thermal-Buffer Decoupling Pyrolysis Heat Supply from HF-Kiln Demand
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** Pyrolysis off-gas split by a gas-quality analyzer: engine-grade fraction (tar < spec after a hot-biochar guard bed) fuels a special-gas reciprocating engine (~40% elec, >90% CHP); tar-laden fraction burns in a FLOX oxidizer. Both exhausts + PV-driven resistance heaters **charge a firebrick TES (≥1000 °C, >95% RTE, 10–100 MWh_th)**. Discharge: 400–700 °C air for the HF kiln jackets + steam/ORC; 150–200 °C air for drying. Control: TES state-of-charge scheduled so the HF kiln — which must not thermally cycle (corrosion/CaSO₄ ring risk) — sees constant zone temperatures through pyrolysis outages; charging priority (1) surplus syngas heat, (2) PV surplus, (3) off-peak grid.

**Closest prior art.** US20220170386A1/WO2022115721A2 + US12,234,797 (Rondo — firebrick TES charged by intermittent renewables, continuous >1000 °C delivery, smart scheduling; ~28 issued patents); EP1167286B1 (constant multi-zone HF-kiln temperature control); US11,976,242/US12,305,121 (PYREG FLOX + cascade); WO2002031408A1 + US12,276,236 (pyrolysis-gas engine CHP + TES).

**Surviving claim angle.** The narrow integrated combination: a **tar-analyzer-driven syngas splitter with on-site-biochar guard bed** routing engine-grade gas to a CHP engine and tar-laden gas to FLOX, both exhausts co-charging one firebrick store alongside PV, where the **TES scheduler is constrained by an acid-kiln no-thermal-cycling invariant** (HF corrosion / CaSO₄ ring limits) across pyrolysis outages. Recite the kiln-degradation constraint + tar-split/guard-bed topology together, not the TES buffer alone.

**CPC.** F28D 20/0056; F02G 5/02; C10J 3/86; H02J 3/28.
**Rosiclare advantage.** Illinois' post-2025 net-metering rewards behind-the-meter self-consumption → PV-to-brick monetizes on-site solar while hardening a weak rural feeder.
**Risk.** High §103 (Rondo + PYREG + EP1167286B1). **Rondo's large partly-unpublished portfolio is the main FTO/anticipation risk — full portfolio review before filing.**

### Concept 16 — Kiln-Shell + Anhydrite-Byproduct Heat Recovery Train for Moisture-Adaptive Feedstock Drying
**Verdict: LIKELY NOVEL ANGLE EXISTS** ⭐ *strongest-tier*

**Design.** Harvest two normally-rejected HF-kiln waste streams: (1) a **radiation-collector shroud** around the rotary kiln shell (200–300 °C skin) → closed air loop at 120–180 °C; (2) **hot CaSO₄ anhydrite discharged at ~200 °C routed through a moving-bed solids-to-air heat exchanger** — the anhydrite acts as a granular sensible-heat carrier, cooling to <60 °C for sale while heating dryer air. Both merge with backbone tail gas into a countercurrent belt dryer. Method is moisture-adaptive: dryer-exit NIR/capacitance sensing modulates belt speed, humid-exhaust recycle damper, and anhydrite-bed bypass to hold pyrolyzer feed at 10–15 wt% ±2%, and **feeds measured moisture forward to the pyrolysis temperature program** to stabilize fixed carbon for EBC/IBI (H/Corg <0.7). Dryer-exhaust condensate polished on site-made AC → reused as H₂SO₄ dilution water (closed water loop).

**Closest prior art.** EP0163565B1 (Bayer — hot-anhydrite reuse *inside* the HF process, not for biomass drying); US4016240A/US4460551A (anhydrite cooling for sale — rejects the heat); US20160053182A1 (Diacarbon — biomass dryer w/ moisture sensor, temperature-feedback only); EP0070710B1 + US8667706B2 (moisture-adaptive dryer control, generic); US4,238,187 + Ferrer et al. (kiln-shell radiation recovery for drying — known).

**Surviving claim angle.** Every subsystem is individually anticipated, so the defensible core is the **narrow cross-plant coupling**: using the HF process's **hot anhydrite byproduct as the granular heat carrier in a moving-bed exchanger dedicated to pyrolyzer-feedstock drying**, combined with the **dryer-exit moisture feed-forward that co-modulates the pyrolysis temperature/residence program to hold char within an EBC/IBI band**. Neither link was found in searches; claim as a method with numeric setpoints (10–15 wt% ±2%, anhydrite <60 °C).

**CPC.** F26B 23/001; F27D 17/008; F26B 25/22; C04B 11/02.
**Rosiclare advantage.** Green southern-IL hardwood (35–50% moisture) + on-site HF reject heat + anhydrite stream → dryer duty met with no purchased fuel (Metzler precedent: ~$500k/yr LP displacement at smaller scale).
**Risk.** High §103 unless the certification-band feed-forward and anhydrite moving-bed duty are recited as *functionally interdependent*. Sweep German/Bayer-era HF plant literature for anhydrite-cooler heat recovery.

### Concept 17 — Hierarchical Thermal-Electric MPC Microgrid Controller with HF-Safety-Prioritized Islanding
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** Three-layer controller. **Layer 1** (economic MPC, 15-min/24–72 h): co-optimizes electric + thermal state vectors (engine dispatch, ORC, PV forecast, firebrick TES SoC, dryer moisture buffer, HF-kiln zone temps, grid import) against Illinois behind-the-meter tariffs, treating TES/dryer as flexible loads and the HF kiln as inflexible with hard ramp constraints. **Layer 2** (thermal balancer, 1-min): allocates backbone exhaust per #14–16 valve topology. **Layer 3** (protection/islanding, ms): on grid loss, sheds discretionary loads and islands onto engine + TES-ORC with **HF-area safety loads (scrubber blowers, HF detection, kiln seal purge, deluge) as the highest-priority N+1 bus**. Distinctive step: the MPC objective embeds **carbon-removal revenue with logged VM0044/Isometric variables as hard constraints** so dispatch never drives char outside creditable quality bounds.

**Closest prior art.** US20140174080A1 (multi-layer trigeneration microgrid CCHP); US10901383B2 (GE — islanding w/ dynamic load-shedding + critical-load supply); US7786617B2 (prioritized-hierarchy load shedding); US20220170386A1 (Rondo TES as flexible load); CN118735235A (carbon-trading terms in economic dispatch — emissions-side).

**Surviving claim angle.** The **MRV-constrained dispatch step**: an economic MPC whose thermal-electric decisions are hard-bounded by continuously logged **CDR-protocol product-quality variables** (pyrolysis temp/residence per VM0044/Isometric) so energy arbitrage can never push char outside creditable bounds — coupled with the specific state vector (HF-kiln zones + firebrick TES + dryer moisture buffer sharing one exhaust backbone). The tri-layer architecture and safety-priority islanding alone will not survive.

**CPC.** H02J 3/381 + H02J 2310/12; G05B 13/048; H02J 9/06; Y04S 10/50.
**Rosiclare advantage.** A weak rural Hardin County feeder makes islanding + behind-the-meter co-optimization economically decisive; single-owner 40-acre park lets one controller lawfully span all assets.
**Risk.** Generic hierarchical MPC + prioritized islanding + carbon-constrained dispatch each anticipated; the HF-safety bus taxonomy risks being treated as nonfunctional labeling. Claim with concrete control-loop mechanics.

---

## Pillar F — Cross-stream couplings (the defensible white space)

### Concept 18 — Self-Fluxing Bio-Reductant Briquette (Metspar–Biocarbon Composite for EAF/Ferroalloy Use)
**Verdict: CROWDED — NEEDS NARROWING**

**Design (composition + method).** Cold-pressed, heat-cured composite replacing *both* fluorspar lump and fossil carbon injectant in EAF/Si/FeSi/FeMn furnaces: **40–70 wt% metspar fines** (≥80% CaF₂, −200 mesh, from flotation middlings + Cave-in-Rock stockpiles) + **20–45 wt% hardwood biochar** (550–750 °C, FC ≥85%, ash ≤3%, VM 5–12%) + **5–15 wt% heavy pyrolysis tar/bio-oil binder** + 0–8 wt% lignin/starch. Blend 60–90 °C, press 100–200 MPa, cure 180–250 °C for 30–120 min under inert gas to **partially coke the tar binder in situ** → cold crushing strength ≥60 kgf, shatter index >90%. In-furnace it is simultaneously (i) slag fluidizer (CaF₂ lowers lime-rich slag liquidus) and (ii) biogenic foaming/reducing carbon — a single-addition "slag conditioner + carbon unit" with net-biogenic CO₂.

**Closest prior art.** US10392574B2 (Kimmel's — single EAF briquette: carbon + basic-oxide slag conditioner + binder; *fossil* carbon + CaO/MgO); **WO2011113632A1 (briquette explicitly combining carbon 2–16% + CaF₂ 0–10% + lime for foaming/viscosity)** (the direct CaF₂+carbon co-briquette hit, but CaF₂ is a minor phase); WO2023283289A1/US20220228082A1 (Carbon Technology Holdings — engineered biocarbon pellets w/ pyrolysis binder — active estate, FTO exposure); CN117625223A (bio-oil coked biochar); DiGiovanni et al. 2025 (biochar+bio-oil EAF foaming, +158% foam).

**Surviving claim angle.** A briquette in which **metallurgical fluorspar fines are the *majority* phase (40–70 wt%, vs. 0–10% in WO2011113632A1)** bound with high-FC biochar via an **in-situ heat-cure-coked pyrolysis tar binder**, claimed with a defined CaF₂:fixed-C ratio + cold crushing strength + CO₂-gasification reactivity window delivering metered slag fluidization + biogenic foaming per addition. Method claims tying the 180–250 °C inert-gas tar cure to strength/reactivity + co-located feed streams are stronger than composition-only.

**CPC.** C22B 1/244; C21C 7/076; C10L 5/447; C21C 5/52.
**Rosiclare advantage.** Metspar fines + biochar + tar binder all originate in-fence; Smithland-pool Ohio River barge access reaches EAF mills at bulk rates.
**Risk.** §103 combining WO2011113632A1 + the CTH biocarbon-pellet family / CN117625223A is realistic; the CTH estate also creates FTO exposure on the biocarbon-binder side.

### Concept 19 — Layered Reactive Biochar–Carbonate Cover for Legacy Fluorspar Tailings (Metal + Fluoride Immobilization Cap)
**Verdict: CROWDED — NEEDS NARROWING**

**Design.** Engineered multilayer dry cover for IKFD legacy tailings (Ba/Cd/Pb-bearing per ATSDR) built from **site reject streams**: Layer 1 (15–30 cm compacted dewatered flotation slimes, k <10⁻⁷ m/s); Layer 2 reactive (10–40 cm: 10–30 vol% hardwood biochar pH 9–11 CEC ≥30, optionally pre-carbonated with CHP flue-gas CO₂ + 50–80 vol% **−6 mm calcite/limestone rejects from XRT ore-sorting** + 5–15 vol% basalt/rock dust); Layer 3 (15–30 cm growth medium). Mechanisms: Pb/Cd immobilized by biochar sorption + carbonate precipitation; **dissolved fluoride precipitated as CaF₂ by calcite-supplied Ca²⁺ at pH 7.5–9**; Ba as BaCO₃/BaSO₄. Method: cap placed over *reprocessed* (fluorite-depleted) tailings so remediation uses the reprocessing campaign's own rejects; monitor leachate F <4 mg/L + quantify CO₂ removal.

**Closest prior art.** US6004069A/WO1998053927A1 (Boliden — multilayer tailings cap w/ crushed-limestone layer + organic carbon for bioremediation; no biochar/CaF₂/CDR); US10245626B2 (barium-carbonate + woody-carbon alkaline substrate for metals — passive bed, no fluoride/CDR); NL2027109B1 (layered biochar remediation + revegetation, REE-focused); WO2020146681A1 (carbon-sequestering surface covering); Buss et al. *Commun. Earth Environ.* (mineral-enriched biochar CDR).

**Surviving claim angle.** The integrated article-plus-method whose **sole reactive inputs are the reprocessing campaign's internal reject streams** — XRT ore-sorter −6 mm carbonate rejects + CO₂-carbonated pyrolytic biochar — engineered so calcite-supplied Ca²⁺ precipitates percolate fluoride as CaF₂ (<4 mg/L) **simultaneously** with Pb/Cd/Ba carbonate+sorption immobilization, coupled to verified carbon-removal accounting across biochar carbon + rock-dust weathering. No single reference combines fluoride (CaF₂) immobilization with heavy-metal carbonate capture in a CO₂-loaded-biochar/ore-reject cap.

**CPC.** B09C 1/08; B09B 1/00; C09K 17/40; B09C 1/00.
**Rosiclare advantage.** District legacy tailings are both the cap's target and its feedstock; federally-funded ISGS characterization is de-risking the resource next door.
**Risk.** Every pillar independently covered → obviousness/combination rejection likely; defensibility rests on fluoride+multi-metal simultaneity, closed-loop internal-reject sourcing, and specific compositional limits.

### Concept 20 — Fluorite-Seeded Activated-Biochar Crystallization Media with Closed-Loop CaF₂ Recovery
**Verdict: CROWDED — NEEDS NARROWING** ⭐ *composition-of-matter candidate*

**Design (composition + method).** Steam-activated hardwood biochar (800–900 °C, BET 600–900 m²/g, 0.3–1.2 mm) **impregnated with 10–25 wt% micronized acid-grade fluorite seed crystals (d50 1–5 µm, from on-site flotation fines) anchored in the macropore network**, + a 2–8 wt% Ca surface reservoir (Ca(OH)₂/CaCl₂). In a fluidized pellet-reactor treating fluorochemical scrubber blowdown (F⁻ 50–2,000 mg/L), lime dosed at Ca/F 0.50–0.60 while seeded media circulates; fluoride removed by **heterogeneous CaF₂ crystallization onto the fluorite seeds** (avoiding gelatinous sludge), polishing to <4 mg/L via residual carbon adsorption. Media grown to >60 wt% CaF₂, then **routed into the acidspar flotation feed** (fluorite → concentrate, carbon → tails/fuel) or into the #18 briquette.

**Closest prior art.** **US9469549B2 (fluidized-bed CaF₂ crystallization seed reactor, pH 5–8, lime dosing)** (anticipates the seeded-FBR method almost element-for-element); *J. Environ. Sci.* 2026 + PMC11011877 (CaF₂/fluorite seeds in continuous FBR, Ca/F 0.55, pH 6 — the claimed window is published); **Song et al. *Molecules* 2023 (fluorite-seeded crystallization + flotation → salable fluorspar)** (overlaps the recovery loop); WO2005070831A1/CN1906129A (Stella Chemifa — CaF₂ from effluent as HF feedstock, using recovered CaF₂ as seed); *J. Anal. Appl. Pyrolysis* 2013 (Ca-loaded carbons forming CaF₂).

**Surviving claim angle.** The **composition-of-matter itself appears unclaimed**: steam-activated biochar (600–900 m²/g, 0.3–1.2 mm) with 10–25 wt% micronized acid-grade fluorite seed anchored in the macropore network + a 2–8 wt% Ca reservoir — no located reference puts crystallization seeds on a porous biocarbon fluidization carrier. Narrowest method claim: the **integrated media lifecycle** — grow to >60 wt% CaF₂ in the FBR, then feed spent media directly into a co-located acidspar flotation circuit (fluorite → concentrate, carbon → tails/fuel). Seeded-FBR crystallization per se, Ca/F 0.50–0.60, <4 mg/L polishing, and generic CaF₂-recycle-to-fluorspar are anticipated → drop or make dependent.

**CPC.** C02F 1/52; C02F 2101/14; B01J 20/20; C01F 11/22.
**Rosiclare advantage.** Seed crystals, AC, fluoride effluent, and the flotation circuit that monetizes loaded media all within one fence line → turns a hazardous-waste liability into acidspar yield.
**Risk.** High KSR exposure (fluorite seeds in FBRs + Ca-loaded carbons + crystallization-plus-flotation). Lean on unexpected results (sludge-free operation, clean media separation in the flotation circuit, MCL polishing) and the single-fence-line closed loop as a system claim.

---

## Bonus concept (21st) — Flue-Gas CO₂ Nanobubble Column Flotation of −20 µm Fluorite Slimes
**Verdict: CROWDED — NEEDS NARROWING**

Recovers −20 µm fluorite slimes using **CO₂-rich CHP flue gas** (8–14 vol%), water-scrubbed, pressure-dissolved and released as bulk nanobubbles (100–400 nm, ≥10⁸/mL) that self-buffer the pulp to pH 6.5–7.5, carbonating exposed calcite while retaining fluorite floatability with sodium oleate — cutting depressant ≥50% and collector 40–60%. **Closest art heavily anticipates the CO₂-flotation mechanism** (US4568454A, US4317715A phosphate/carbonate; US4676804 coal; CO₂ nanobubbles on pyrite; S0892687523003151 shows CO₂ carbonates *fluorite* too — an enablement risk for calcite-only selectivity). Surviving angle: the **system/integration claim** — on-site combustion flue gas as *both* flotation gas *and* in-situ calcite-carbonating depressant in direct oleate flotation of −20 µm fluorite slimes in a wash-water column, with recited holdup/velocity/cleaning windows. **CPC** B03D 1/24; B03D 1/14; B03D 1/006; C02F 1/24. Weakest of the set on selectivity enablement — filed only if slimes recovery is economically material.

---

## Patent-classification cheat sheet

Seed a professional CPC/USPC search here (from the [patent-landscape brief](appendix-briefs/patent-landscape.md)):

| Domain | CPC / area | Crowding |
|---|---|---|
| Fluorspar flotation / mineral processing | **B03D 1/00, B03B, B07C 5/342** (sorting); C22B | Crowded (AWG, collectors) |
| Tailings retreat / gravity | B03B 9/06, B03D 1/002 | Moderate; **legacy-tailings + closed water loop is thinner** |
| HF / inorganic fluoride manufacture | **C01B 7/19** (HF), C01D, C01F 11 | Base patents largely expired; *integration* unclaimed |
| Alkali-fluoride / HF-free routes | C01D 3/02, C01D 15/04, B01J 19/20 | **FluoRok/Oxford estate active — FTO critical** |
| LiPF₆ / electrolyte salts | **C01B 25/455**, C01D 15/005, H01M 10/0568 | Crowded; **no US-owned process IP = strategic** |
| Pyrolysis / biochar | **C10B 53/02**, C10B 57/00, C05F | Crowded (PYREG, Cool Planet, CTH) |
| Activated carbon | **C01B 32/30–39** (32/318, 32/336) | Crowded |
| Hard-carbon anodes | **H01M 4/587**, H01M 10/054 | Crowded (Kuraray, CN filings) |
| Fluorinated carbon (CF_x) | **H01M 4/5835**, C01B 32/10, H01M 6/16 | Crowded; **gradient/additive-route composition thinner** |
| Water-treatment adsorbents | **B01J 20/20, C02F 1/28, C02F 1/52** | Crowded; **byproduct-lime provenance + closed loop thinner** |
| Metallurgical briquettes / flux | **C22B 1/244**, C21C 7/076, C10L 5/447 | Moderate; **metspar-majority composite thinner** |
| Tailings caps / remediation | **B09C 1/08**, B09B 1/00, C09K 17/40 | Crowded; **fluoride+metal simultaneity thinner** |
| Thermal energy storage / heat recovery | F28D 20/00, F27D 17/004–008, F26B 23/001 | Crowded (Rondo); **HF-kiln-continuity constraint thinner** |
| Microgrid / MPC control | H02J 3/381, G05B 13/048, H02J 9/06 | Crowded; **MRV-constrained dispatch thinner** |
| Carbon-credit MRV instrumentation | G05B 13/04, G01N 33/22, G06Q 30/018 | Emerging/crowding fast |

---

## Portfolio strategy & priority tiers

**The strategic thesis:** file for the *couplings and closed loops that require your co-located site to practice*, not the individual unit operations (which are anticipated). These claims are (a) genuinely novel as combinations, (b) hard to design around without your specific site, and (c) hard to infringe without replicating your whole plant — which also, honestly, makes some of them **hard to detect and enforce** against a competitor operating inside their own fence. Weigh that trade-off with counsel: a hard-to-detect system patent still has defensive and licensing value, but a detectable composition-of-matter claim (#7, #20, and the reagent in #2) is worth more per dollar of prosecution.

| Tier | Concepts | Why | First action |
|---|---|---|---|
| **1 — File first** | **#11, #14, #16** | Only three `LIKELY NOVEL ANGLE EXISTS` verdicts; genuine white-space couplings | Provisional + professional novelty search |
| **2 — Composition-of-matter** | **#7, #20** (+ reagent in **#2**) | Detectable, enforceable claim type; retreat to the quantified structure/composition window | Lab data to support the specific ranges *before* filing |
| **3 — High-value but FTO-gated** | **#4, #3** (HF-free LiPF₆/fluorides) | Huge market + "no US LiPF₆ IP" gap, **but** Oxford/FluoRok + the CN CaF₂-halex family are live threats | **FTO opinion (incl. CNIPA) before any spend** |
| **4 — Cross-stream system claims** | **#1, #5, #8, #18, #19** | Defensible closed-loop combinations; value is site-specific | Draft narrow system claims reciting the loop, not the flowsheet |
| **5 — Integration/control** | **#9, #10, #12, #13, #15, #17** | Real engineering value; narrowest inventive steps, easiest to design around | Consider trade-secret vs patent; file only if a detectable, concrete control law exists |
| **6 — Optional** | **#21** | Selectivity-enablement risk | File only if slimes recovery is economically material |

**Cross-cutting pre-filing actions (do these first, they protect the whole portfolio):**
1. **Commission a CNIPA / Espacenet native-Chinese-language search.** Nearly every "risk" note flags un-searched Chinese art as the top unquantified threat (esp. #4, #7, #14).
2. **Get an FTO opinion on the Oxford/FluoRok mechanochemical estate** (EP4452857A1 + expected 2024–25 priority filings) before committing to #3/#4.
3. **Generate the load-bearing experimental data** each concept's risk note calls out (unexpected-results data is what converts a "crowded" concept into an allowable one): #2 heating-elimination/silica speciation, #7 shell bond-fraction depth profile + sub-limit capacity, #11 leachable-F suppression, #12 Ca+La synergy, #20 sludge-free/clean-separation.
4. **Decide patent-vs-trade-secret per concept.** The hard-to-detect integration/control concepts (Tier 5) may protect better as trade secrets than as unenforceable patents.

---

## Caveats — how to use this honestly

- **Not legal advice; not an FTO or novelty opinion of record.** Every verdict is a *research hypothesis*. Patentability is decided by counsel + examiner working from a professional search. Retain a registered patent attorney/agent before filing or public disclosure.
- **Search coverage is incomplete.** These findings come from English-language web + Google Patents/Espacenet surface searches. **Chinese-, Japanese-, and Korean-language patent literature was only partially reachable** and is repeatedly flagged as the largest residual risk. Non-patent literature (conference papers, theses, German Bayer-era HF engineering reports) was sampled, not swept.
- **"CROWDED — NEEDS NARROWING" is the norm, not a failure.** It means the broad idea is taken but a narrow, defensible core plausibly survives — exactly what you'd expect in a 50–100-year-old field. The surviving-claim-angle text is where the value is.
- **Public disclosure risk.** Do not publicly disclose (pitch decks, grant applications, papers, this document if shared externally) any concept you intend to patent before filing at least a provisional — a public disclosure can start the US 12-month grace clock and destroy foreign rights immediately. Treat this dossier as confidential.
- **Numbers and conditions are engineering estimates** grounded in the cited literature, not validated process data. Every operating window needs bench/pilot confirmation.
- **Provenance:** generated by an automated multi-agent research fleet (8 research + 5 invention + 1 curation + 21 verification agents). Full cited briefs are in [`appendix-briefs/`](appendix-briefs/). Where a claim carries a URL, that URL is the agent's cited source; spot-check load-bearing citations before relying on them.

---

*Generated 2026-07-06. See `appendix-briefs/` for the eight full source-cited research briefs (fluorspar beneficiation, fluorochemicals, biochar pyrolysis, biochar materials, energy integration, Rosiclare site, regulatory, patent landscape).*
