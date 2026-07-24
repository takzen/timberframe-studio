# timberframe-studio

**Parametric CAD for small timber structures** — timber-frame cabins (35–60 m²), decks, carports and lean-to roofs. Draw a floor plan, pick real lumber from a catalogue, and get a live 3D model with a bill of materials and a cost estimate.

**▶ Try it live: https://takzen.github.io/timberframe-studio/** &nbsp;·&nbsp; runs entirely in the browser (desktop, tablet or phone), PL/EN toggle in the toolbar.

> ⚠️ **Work in progress — indicative tool, not a structural design.** This is an early prototype. The structural check is a first-pass estimate to catch gross under-sizing; it is **not** a substitute for a qualified/licensed engineer or a stamped design, and a real build must be checked and approved by one. Full terms — including exactly what the check does and does not cover — are in **[DISCLAIMER.md](DISCLAIMER.md)** (English + Polish). See also [Status](#status).

![Timber-frame cabin: 2D plan, live 3D preview and bill of materials](docs/domek.png)

## The idea

Three steps, left to right across the screen:

1. **Draw** — lay out the plan on a snapping grid. Walls and beams are lines, posts are points, decks and roofs are rectangles. Drag anything to move it; grab a handle to reshape it. Snapping prefers existing geometry over the grid, so walls meet exactly.
2. **Pick** — select an element and choose a real cross-section (45×145, 100×100, …), a timber species and grade (C24, KVH, glulam GL24h, pressure-treated, larch) and a sheathing material. Every catalogue entry carries a price.
3. **Visualise** — the 3D view rebuilds as you edit. Toggle between the finished building and a framing-only view.

Every primitive expands into **real individual members** — each stud, rafter and deck board is its own mesh, not one merged blob. That is what makes the bill of materials trustworthy: it is counted from the same geometry you are looking at.

![Carport in framing-only view, showing knee braces](docs/wiata-konstrukcja.png)

## What it does today

- **Construction primitives** — post, beam, knee brace, deck, mono-pitch roof, gable roof, and stud wall with window/door openings (headers, sills and cripple studs generated automatically).
- **Direct manipulation** — drag to move, handles to resize, snap to existing points, copy/paste and duplicate (Ctrl+C/V, Ctrl+D), undo/redo, delete.
- **Lumber catalogue** — commercial cross-sections, seven species/grades with per-m³ prices, eight sheathing materials with per-m² prices.
- **Bill of materials and cost** — grouped by member, section and species, with piece counts, cut lengths, running metres, m², m³ and cost. Fasteners (post bases, anchors, angle brackets, structural screws) are added from per-connection rules. Every unit price is editable in the **Prices** dialog and the overrides persist.
- **Mitred and compound ends** — knee braces get their end faces cut to the angle derived from their pitch, so they seat flat against post and beam. A brace drawn diagonally in plan also gets a side cut, swinging its post-end face onto the nearer post face so it still seats flat instead of meeting the post skew. Rafters are cut plumb at both ends: the cut plane is rotated off square by the roof pitch, so the head meets the ridge vertically and the tail hangs vertically for the fascia. The bill of materials orders the longer edge, not the centreline.
- **Indicative structural check (Eurocode 5 + wind)** — rafters and deck joists as simply-supported bending members, beams as a series of simple spans, and posts in axial compression with buckling. Loads flow down the path roof → beam → post: self-weight from geometry, snow by Polish zone, imposed on decks. Wind (EN 1991-1-4) adds roof uplift by Polish wind zone and terrain category, checks each post base for net tension (hold-down) — the case that governs light carports — and flags rafters that bend the other way once the suction overcomes their dead load. Per-member bending / shear / deflection / buckling / hold-down utilisation, and the over-utilised members are highlighted **in place** — amber (≥90%) and red (>100%) on both the 2D plan and the 3D model, so you can see exactly which beam is the one at 178%, or which post the wind lifts. Updates live as you resize a section. Explicitly bounded — see [Status](#status).
- **Printable report** — a one-page document (verdict, assumptions, per-member utilisation, bill of materials, foundations, cost incl. foundations, disclaimer) that prints or saves to PDF straight from the browser, in the current language.
- **Persistence** — the project autosaves to `localStorage`; export/import as JSON, export the bill of materials as CSV.
- **Starter templates** — 6×7 m timber-frame cabin with a covered deck, 4×6 m carport, 3×3 m carport.

## Quick start

```bash
pnpm install
pnpm dev
```

Then load a template from the **Template…** dropdown in the toolbar and hit **Fit** to frame the view.

```bash
pnpm build     # typecheck + production build
pnpm lint
```

> **Bilingual UI.** The interface ships in **English and Polish** — toggle **PL / EN** in the toolbar (Polish is the default). The codebase itself is English throughout; Polish lives only in the translation layer (`src/i18n.ts`), so the domain terms shown to Polish users (`słup` = post, `krokiew` = rafter, `zastrzał` = brace) are translations, not identifiers.

## How it works

The core is a two-stage pipeline with a hard boundary in the middle:

```mermaid
flowchart LR
    A["<b>PrimitiveDef[]</b><br/>what you draw"]
    B["<b>Element[]</b><br/>real members"]
    C["three.js meshes"]
    D["bill of materials<br/>+ cost"]
    A -->|pure generators| B
    B --> C
    B --> D
```

- A **primitive** is what you draw: a wall from A to B, 2.6 m tall, 60 mm studs at 600 mm centres.
- A **generator** is a pure function `Def → Element[]` with no dependencies beyond arithmetic. The wall generator emits a sill plate, a top plate, every stud, every header and every sheathing panel as separate elements. Because generators are pure they run outside the browser — the geometry in this repo was verified by executing them in Node and checking coordinates, not by eyeballing screenshots.
- An **element** is a single physical member: an axis from `from` to `to` in 3D, a cross-section, a species, optional end-cut angles. One representation covers a 200×200 post, a deck board and an OSB panel, which is why there is exactly one renderer and one costing path.

```
src/
  i18n.ts                 EN/PL dictionary + translate helper
  model/
    types.ts              primitive definitions + the universal Element
    catalog.ts            sections, species, sheathing, concrete, fasteners — default prices
    pricing.ts            editable price overrides on top of the catalogue
    generators/           pure Def → Element[] functions, one per primitive
    materials.ts          bill of materials, fastener rules, cost, CSV
    structural/           indicative EC5 checks + load path
    foundations/          post footings + slab, sized from the load path
  plan/                   2D plan editor (SVG): drawing, snapping, dragging
  scene/                  3D preview (react-three-fiber)
  ui/                     toolbar, property panel, tables
  templates/              starter templates
```

## Status

Working: drawing, dragging, reshaping and copy/paste; the catalogue with editable prices; the bill of materials with costs; a printable report; persistence; both roof types; walls with openings; braces with mitred ends and rafters cut plumb; indicative EC5 checks for rafters, joists, beams and posts with a roof → beam → post load path, plus wind uplift and hold-down; foundations; a responsive layout for tablet and phone.

The structural check covers bending members (rafters, joists), beams (as a series of simple spans between their supports), and posts (compression + buckling), for dead + snow/imposed under 1.35·G + 1.5·Q. Wind (EN 1991-1-4) is covered as roof uplift, the resulting post hold-down (net base tension under 1.0·G + 1.5·W, with an indicative anchor capacity), and the reversed bending of rafters when that uplift overcomes their dead load — it does **not** cover wind pressure on walls, connections, global stability and bracing, rafter thrust, biaxial bending, vibration, or foundations. It makes deliberate simplifications: posts are pinned top and bottom (β=1), gable roofs are treated as **couple roofs** (ridge non-load-bearing, horizontal thrust ignored), the uplift coefficient is a whole-roof resultant (not the local cladding peak), hold-down is checked at discrete posts (not wall studs, whose sill anchorage is a separate design), and decks are checked at full clear span, so a deck with no intermediate bearer correctly reads as overloaded. Treat a green verdict as "not grossly under-sized", not "approved". Full terms in [DISCLAIMER.md](DISCLAIMER.md).

Not there yet:

- **No birdsmouth on the rafters.** The ends are cut plumb, but where a rafter crosses its wall plate there should be a seat notch. The end-cut mechanism only angles the end faces — a notch part-way along a member needs a different solid.
- No rotation about an element's own centre, and no multi-select yet (copy/paste and duplicate work on the single selected element).
- No dimension chains between elements; distances have to be read off coordinates.
- The origin cannot be moved, and there are no local coordinate systems.
- **Default prices are indicative** Polish-market figures. The **Prices** dialog in the toolbar lets you override any of them (e.g. from a local sawmill's quote) — type them in or export the list to CSV, fill it in a spreadsheet and import it back (keyed by catalogue id). Overrides persist and re-cost the project, but until you set them, treat the totals as an order-of-magnitude estimate.

## Built with

Vite · React · TypeScript · three.js via react-three-fiber and drei · zustand · pnpm

Units are metres throughout; the coordinate system is X/Y on the ground with Z up.

## License

MIT © Krzysztof Pika — see [LICENSE](LICENSE).
