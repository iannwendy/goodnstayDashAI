# Draw.io (`diagrams.net`) XML Reference & Geometry Recipes

Always generate **uncompressed** `<mxfile>` XML so `.drawio` files remain human-readable, git-diffable, and directly editable in both https://app.diagrams.net/ and VS Code Draw.io integration.

---

## 1. Canonical `<mxfile>` Skeleton

```xml
<mxfile host="app.diagrams.net" agent="Antigravity-DrawioBuilder" version="24.7.17">
  <diagram id="page-1" name="Overview">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1600" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- Vertices and Edges go here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

> **Multi-page Diagrams:** Add additional `<diagram id="page-2" name="...">` blocks inside `<mxfile>`. Every `<diagram>` must have its own `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>...</root></mxGraphModel>`.

---

## 2. Curated Accessible Color Palette

Always pair `fillColor` and `strokeColor` with `fontColor=#1A1A1A;` (or `#FFFFFF` only on dark headers):

| Semantic Role | `fillColor` | `strokeColor` | Typical Usage |
| :--- | :--- | :--- | :--- |
| **Primary / Action / Service** | `#dae8fc` | `#6c8ebf` | Core steps, API services, backend handlers |
| **Success / Start / Completed** | `#d5e8d4` | `#82b366` | Start nodes, approved states, happy-path outputs |
| **Decision / Warning / Async** | `#fff2cc` | `#d6b656` | Rhombus decisions, queues, pending states |
| **External / 3rd-Party / Highlight** | `#ffe6cc` | `#d79b00` | Payment gateways, external APIs, webhooks |
| **Error / Cancel / Critical** | `#f8cecc` | `#b85450` | Error branches, rollbacks, rejected states |
| **Data / Storage / Auth** | `#e1d5e7` | `#9673a6` | Databases, caches, auth/middleware |
| **Container / Neutral / Actor** | `#f5f5f5` | `#666666` | Swimlanes, VPC/system boundaries (`fontColor=#333333;`) |

---

## 3. Shape Recipes by Diagram Type

### A. Flowchart & Swimlanes
- **Swimlane Container (`parent="1"`):**
  ```xml
  <mxCell id="lane-guest" value="Guest (Web / App)" style="swimlane;whiteSpace=wrap;html=1;startSize=36;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;fontStyle=1;fontSize=13;" vertex="1" parent="1">
    <mxGeometry x="80" y="80" width="320" height="620" as="geometry" />
  </mxCell>
  ```
  - **CRITICAL:** Children inside `lane-guest` have `parent="lane-guest"` and **relative** `x`, `y` (`y >= 56` so they clear `startSize=36` header!).
  - **CRITICAL:** Any edge connecting a node in `lane-guest` to a node in `lane-api` **MUST** set `parent="1"`!
- **Process Step:**
  `rounded=1;whiteSpace=wrap;html=1;arcSize=12;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=12;` (`width="180" height="60"`)
- **Start / End Pill:**
  `rounded=1;whiteSpace=wrap;html=1;arcSize=50;fillColor=#d5e8d4;strokeColor=#82b366;fontStyle=1;fontSize=12;` (`width="140" height="44"`)
- **Decision Diamond:**
  `rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontSize=12;` (`width="170" height="84"` — diamonds need extra width/height because usable text area is ~50% of bounding box!)

### B. System Architecture & Cloud Components
- **System / Zone Frame (Dashed Container):**
  `swimlane;whiteSpace=wrap;html=1;startSize=32;dashed=1;dashPattern=8 4;fillColor=#fafafa;strokeColor=#999999;fontStyle=1;`
- **Database Cylinder:**
  `shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=12;fillColor=#e1d5e7;strokeColor=#9673a6;` (`width="130" height="80"`)
- **Queue / Event Topic:**
  `shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;fillColor=#fff2cc;strokeColor=#d6b656;`

### C. ERD (Entity-Relationship Diagram)
- **Entity Table:**
  ```xml
  <mxCell id="tbl-booking" value="bookings" style="shape=table;startSize=32;container=1;collapsible=1;childLayout=tableLayout;fixedRows=1;rowLines=0;fontStyle=1;align=center;resizeLast=1;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
    <mxGeometry x="120" y="120" width="240" height="152" as="geometry" />
  </mxCell>
  <mxCell id="tbl-booking-r1" value="PK  id : uuid" style="shape=partialRectangle;connectable=0;fillColor=none;top=0;left=0;bottom=0;right=0;align=left;spacingLeft=10;fontStyle=4;html=1;" vertex="1" parent="tbl-booking">
    <mxGeometry y="32" width="240" height="30" as="geometry" />
  </mxCell>
  ```
- **Crow's Foot 1-to-Many Edge:**
  `edgeStyle=entityRelationEdgeStyle;fontSize=11;html=1;endArrow=ERmany;startArrow=ERmandOne;rounded=0;`

### D. Sequence Diagram
- **Participant Header + Lifeline:**
  Place participant boxes along `y="80"` with `width="150" height="44"` spaced `240px` apart horizontally (`x = 80, 320, 560, 800`), draw dashed lifelines downward, or use `shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;outlineConnect=0;` (`width="150" height="520"`).
- **Synchronous Call Arrow:**
  `html=1;verticalAlign=bottom;endArrow=block;endFill=1;rounded=0;`
- **Return / Async Dashed Arrow:**
  `html=1;verticalAlign=bottom;endArrow=open;dashed=1;endSize=8;rounded=0;`

---

## 4. Clean Edge Routing & Port Constraints

To avoid overlapping "spaghetti" connectors:
1. Always default to orthogonal rounded edges for flowcharts and architecture diagrams:
   ```text
   edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=1.5;fontSize=11;labelBackgroundColor=#FFFFFF;
   ```
2. Explicitly bind exit and entry ports when multiple arrows leave the same shape (especially decision diamonds):
   - **Top:** `exitX=0.5;exitY=0;exitDx=0;exitDy=0;`
   - **Right:** `exitX=1;exitY=0.5;exitDx=0;exitDy=0;`
   - **Bottom:** `exitX=0.5;exitY=1;exitDx=0;exitDy=0;`
   - **Left:** `exitX=0;exitY=0.5;exitDx=0;exitDy=0;`
   (Use corresponding `entryX` / `entryY` on the target side.)
3. Always include `labelBackgroundColor=#FFFFFF;` on labeled edges so text stays legible over grid lines or borders.
4. For loop-backs (e.g., retry arrow going back up to an earlier step), add an explicit `<Array as="points"><mxPoint x="..." y="..."/></Array>` inside `<mxGeometry relative="1" as="geometry">` to route cleanly around the outside margin (`x - 60` or `x + width + 60`) instead of cutting through intermediate boxes.
