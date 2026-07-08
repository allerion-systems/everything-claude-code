# EdgeGlass — bill of materials

A reference build for the on-lens (Tier 0) hardware. Everything is
commodity/maker-grade so the whole rig can be self-fabricated. Swap parts
freely — the runtime only assumes a local model endpoint and a camera/mic.

## Printed parts

| Part | File | Material | Notes |
|------|------|----------|-------|
| Temple-arm mount | [`glasses-mount.scad`](glasses-mount.scad) | PETG / ABS | 0.2mm layers, 3 perimeters, 30% infill, no supports |

Print orientation: clip mouth facing up so the snap features print
support-free. Measure your frame's temple arm and override `temple_w` /
`temple_h` before slicing.

## Electronics

| Qty | Component | Purpose | Notes |
|-----|-----------|---------|-------|
| 1 | Compute puck (SBC/SoM with NPU, e.g. an edge AI board) | Runs the local Hermes GGUF + task force | Any board that can serve Ollama/llama.cpp on localhost |
| 1 | Global-shutter camera module | Perception (vision) | Global shutter reduces motion smear when walking |
| 1 | MEMS microphone breakout | Perception (audio) | On-device STT only; audio never persisted |
| 1 | Monocular micro-display or waveguide | HUD output | Line/column budget enforced in `hud.js` |
| 1 | Bone-conduction transducer | Voice channel | Keeps ears open for ambient safety |
| 1 | LiPo cell + protected charger | Power | Size to your board's draw |
| 1 | Tactile "capture consent" button + status LED | Consent cue | Hardware interlock for the no-covert-capture rule |

## Consumables / fasteners

| Qty | Item |
|-----|------|
| 2 | Silicone retention straps (fit `strap_slot_w`, default 3mm) |
| 4 | M2 heat-set inserts + M2 screws (puck bay) |
| — | Flexible filament offcut for the temple pad (comfort/grip) |

## Assembly (summary)

1. Snap the printed mount onto the temple arm; verify the clip retains without
   cracking the frame.
2. Seat the compute puck in the bay, secure with the silicone straps.
3. Press the camera module into the tilted boss (default 12° forward/down).
4. Wire the microphone, display, and bone-conduction transducer to the puck.
5. Wire the **consent button + status LED** in-line: capture is physically
   gated on the button, and the LED is lit whenever a sensor is live. This is
   the hardware backstop for the Guardian's no-covert-capture policy.
6. Flash the puck, start your local model server, point
   `GLASS_MODEL_ENDPOINT` at `localhost`, and run the task force.

## Design intent

- **Visible-capture interlock.** The status LED and consent button make
  recording observable to people nearby — the ethical default, in hardware.
- **Repairable & printable.** No custom PCBs required for a first build; every
  part is off-the-shelf or printed.
- **Local-only.** Nothing in this BOM requires a network connection to
  function; the cloud is optional and off by default.
