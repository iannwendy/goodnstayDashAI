# Draw.io Diagram Builder — Lessons Learned & Preferences

> **Agent Pre-Flight Rule:** Read this file (or run `drawio_helper.py lessons`) **before** designing any `.drawio` diagram. Whenever the user gives layout/style feedback or edits a `.drawio` file manually, distill the lesson and promote it here via `drawio_helper.py log-feedback --promote`.

## 1. User Style & Visual Preferences
- Save `.drawio` files directly inside the project workspace (uncompressed XML) so they can be dragged into `https://app.diagrams.net/` or opened in VS Code immediately. *(baseline)*
- Always add `whiteSpace=wrap;html=1;` and `labelBackgroundColor=#FFFFFF;` on labeled connectors so Vietnamese diacritics and multi-word labels wrap cleanly without colliding with lines. *(baseline)*
- Size boxes generously for Vietnamese text: minimum `180x60` for standard process steps and `180x88` for `rhombus` decision nodes (usable area inside a diamond is ~50% of its bounding box). *(baseline)*

## 2. Layout & Routing Rules
- Maintain at least `70px` vertical gap and `90px` horizontal gap between sibling nodes (`gridSize="10"`, coordinates aligned to multiples of `10`). *(baseline)*
- Explicitly specify `exitX/exitY` and `entryX/entryY` whenever a node has 2+ outgoing or incoming edges (especially `Yes`/`No` branches on decision diamonds) so arrows never overlap on the same port. *(baseline)*
- Route backward/retry loops around the outer lane margin using `<Array as="points"><mxPoint .../></Array>` so lines never slice through intermediate shapes. *(baseline)*

## 3. XML & Container Pitfalls
- Inside a `swimlane` or container (`parent="lane-x"`), child `mxGeometry` `(x, y)` coordinates are **relative** to the container's top-left corner, and `y` must be `>= startSize + 20` (e.g., `y >= 56` when `startSize=36`) to avoid overlapping the header bar. *(baseline)*
- Any `<mxCell edge="1">` connecting two vertices in **different** swimlanes/containers MUST have `parent="1"` (or their lowest common ancestor), never one of the child swimlanes. *(baseline)*
- Escape `&` as `&amp;`, `<` as `&lt;`, `>` as `&gt;`, and `"` as `&quot;` inside XML attributes (`value="..."`). *(baseline)*

## 4. Project & Domain Conventions
- Keep terminology aligned with `goodNstay` domain terms (e.g., Guest, Host/Partner, Accommodation, Booking, Payment Gateway) when drawing product flows unless the user specifies otherwise. *(baseline)*
