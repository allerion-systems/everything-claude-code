# EdgeGlass network — the Gateway layer

The network that supports the glasses is **offline-first** and **tiered by
privacy**. The lens does as much as possible locally; work only moves outward
when it must, and never past a boundary the wearer hasn't consented to.

## Topology

```
        ┌────────────────────────────────────────────────────────┐
        │  Tier 0 — On-lens (the glasses)                         │
        │  perceive → guard → plan → act, local Hermes GGUF       │
        │  no raw frames persisted · works fully offline          │
        └───────────────┬────────────────────────────────────────┘
                        │  BLE / Wi-Fi Direct (encrypted, paired)
                        │  derived text only — never raw frames
        ┌───────────────▼────────────────────────────────────────┐
        │  Tier 1 — Phone hub (the Gateway)                       │
        │  heavier local model, episodic memory, reflection loop  │
        │  consent store · policy sync · on-device only           │
        └───────────────┬────────────────────────────────────────┘
                        │  mTLS over local network (opt-in)
        ┌───────────────▼────────────────────────────────────────┐
        │  Tier 2 — Home node (optional)                          │
        │  bigger GGUF, long-term memory, batch reflection        │
        │  never leaves the LAN unless the wearer exports it      │
        └─────────────────────────────────────────────────────────┘
                        ┆
                        ┆  Tier 3 — Cloud (default: OFF)
                        ┆  no tokens spent unless explicitly enabled
```

## Design rules

1. **Local by default.** Every tier can run standalone. If the phone or home
   node is unreachable, the lens degrades to its on-device model and reflexes —
   it never blocks on the network.
2. **Text, not frames.** Only derived, redactable text crosses a link. Raw
   camera/mic data never leaves Tier 0.
3. **Consent is the boundary.** A capability (e.g. `share.external`) gates each
   hop outward. The Guardian runs at *every* tier, not just the lens.
4. **Latency-tiered routing.** A tick that fits the on-lens budget stays on the
   lens. Only work that overflows the budget *and* is non-critical is offloaded
   to Tier 1/2; critical alerts are always answered locally.
5. **Cloud is opt-in and token-free by default.** Tier 3 exists only if the
   wearer turns it on. The reference build spends zero API tokens.

## Link security

| Link | Transport | Protection |
|------|-----------|-----------|
| Lens ↔ Phone | BLE / Wi-Fi Direct | Paired, per-session symmetric key |
| Phone ↔ Home | LAN | mutual TLS, pinned cert |
| Any ↔ Cloud | WAN | Off unless enabled; then TLS + explicit consent |

## Offload decision (per tick)

```
if action is critical            -> answer on-lens, always
else if within on-lens budget    -> answer on-lens
else if phone hub reachable      -> offload to Tier 1
else if home node reachable      -> offload to Tier 2
else                             -> degrade: reflex or "standing by"
```

## Bandwidth envelope

Because only summarized text crosses links, a busy glance loop is a few hundred
bytes per tick, not megabytes of video. A day of heavy use fits comfortably in
BLE's budget and never touches cellular data.
