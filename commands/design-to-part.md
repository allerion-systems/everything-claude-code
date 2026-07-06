---
description: Design-to-part pipeline. Runs the tesla-cim-designer agent to design a manufacturable part from your requirements, then hands the package to the machinist-fabricator agent to produce build-ready 3D-printable / machinable output. WAIT for user confirmation of the design before fabricating.
---

# Design-to-Part Command

This command runs the full **idea → manufacturable part** pipeline by chaining two agents:

1. **tesla-cim-designer** — captures requirements and designs the part as parametric CAD (CadQuery/OpenSCAD → STEP + STL), applies DFM/DFA, and emits an RFQ handoff package.
2. **machinist-fabricator** — validates the package, then produces build-ready output: slicer settings or CNC process plan, BOM, assembly sequence, and a QC/inspection plan.

## What This Command Does

1. **Capture requirements** — function, loads, interfaces, quantity, material, tolerances, budget, lead time. Ask for anything load-bearing or fit-critical that's missing.
2. **Design (tesla-cim-designer)** — select the manufacturing process, author parametric CAD, run a DFM review, specify tolerances/GD&T and material, export STEP + mesh, and write the RFQ (`rfq.yaml` + `*-drawing.md`).
3. **STOP for confirmation** — show the user the design summary and the RFQ. Do not fabricate until the user confirms the design is what they want.
4. **Fabricate (machinist-fabricator)** — validate the mesh/geometry, produce slicing settings or a CNC/sheet-metal process plan, a BOM, an assembly/build sequence (for multi-part builds), and a QC/inspection plan.
5. **Deliver** — a `build/<part>/` folder with everything a shop or printer operator needs, and a note on how the finished part is verified against spec.

## When to Use

Use `/design-to-part` when you want a physical thing designed and made buildable:
- A bracket, enclosure, fixture, adapter, mount, or mechanism.
- A heatsink/cold plate/chassis or other chip-adjacent mechanical hardware.
- A CubeSat structure or other published-standard hardware.
- Anything for 3D printing, CNC, or sheet metal.

## Guardrails (enforced by both agents)

- **No proprietary/trade-secret designs.** Designs are clean-room originals to your *requirement*, built from public standards and open hardware — not copies of a company's protected design (e.g., NVIDIA silicon/board layouts). Freedom-to-operate is your responsibility.
- **No silicon.** These agents design mechanical hardware, not integrated circuits. For actual chip design, use an EDA/foundry flow (RISC-V, OpenLane/OpenROAD, an open PDK) — the agents will point you there and can design the *packaging, cooling, and enclosure* around a chip.
- **Export control.** Spaceflight/defense/advanced-compute hardware may be ITAR/EAR-controlled; the agents flag it and you handle classification and licensing before sharing across borders.
- **Safety-critical parts** need physical testing and a licensed PE sign-off — the agents will say so and will not certify.

## Usage

```
/design-to-part <describe what you want to build, with loads/interfaces/quantity/material if you know them>
```

Example:

```
/design-to-part a wall mount for a 2 kg mini-PC, four M4 holes on a 100x100 VESA pattern, PETG, print on a 0.4mm nozzle, one-off
```

The command will return a parametric model, an RFQ, and — after you confirm — a full fabrication package.
