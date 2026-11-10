---
name: drawio-diagram-builder
description: >-
  Use this skill whenever the user asks to create, edit, convert, validate, or improve
  diagrams for diagrams.net / draw.io (.drawio files or https://app.diagrams.net/ links)
  such as Flowcharts, Swimlanes, Sequence Diagrams, ERDs, Use Case Diagrams, or System
  Architectures — and whenever the user gives feedback or manual edits on a .drawio file.
---

# Draw.io (`diagrams.net`) Diagram Builder & Self-Learning Skill

This skill enables the agent to generate production-ready, uncompressed `.drawio` files directly inside the project workspace (ready to drag-and-drop into https://app.diagrams.net/ or open in VS Code), optionally generate 1-click `https://app.diagrams.net/#R...` preview links, validate geometry/XML automatically, and **continuously improve itself** by recording user feedback and learning from manual diagram edits.

## Skill Components

- **CLI Helper ([`scripts/drawio_helper.py`](./scripts/drawio_helper.py))**:
  Zero-dependency Python 3 tool for pre-flight lesson recall (`lessons`), XML + visual geometry validation (`validate`), 1-click browser URL generation (`url`), structured feedback logging & promotion (`log-feedback`), and silent preference extraction from manual user edits (`diff-learn`).
- **XML & Geometry Guide ([`references/drawio_xml_guide.md`](./references/drawio_xml_guide.md))**:
  Canonical `<mxfile>` structure, accessible color palette, shape recipes (Flowchart/Swimlane, System Architecture, ERD, Sequence Diagram), and port-routing rules.
- **Self-Learning Memory ([`memory/lessons_learned.md`](./memory/lessons_learned.md) & [`memory/feedback_log.jsonl`](./memory/feedback_log.jsonl))**:
  Persistent knowledge store of user visual preferences, layout/routing rules, XML/container pitfalls, and `goodNstay` domain conventions.
- **Working Reference ([`examples/sample_booking_flow.drawio`](./examples/sample_booking_flow.drawio))**:
  Validated multi-swimlane diagram template.

---

## Mandatory Workflow (Every Diagram Task)

### Step 1: Pre-Flight Recall (Read Accumulated Lessons First)
Before designing or editing any `.drawio` file, **always** inspect past lessons and user preferences so you never repeat an old layout mistake or ignore a stated preference:
```bash
python3 /Users/iannwendy/Desktop/goodNstay/.agents/skills/drawio-diagram-builder/scripts/drawio_helper.py lessons
```
Also consult [`references/drawio_xml_guide.md`](./references/drawio_xml_guide.md) when building swimlanes, ERDs, or sequence diagrams.

### Step 2: Plan Grid Layout Before Writing XML
Plan coordinates explicitly on a `10px` grid before writing `<mxCell>` tags:
1. **Choose output location:** Save inside the project workspace (e.g., `docs/diagrams/<name>.drawio` or the exact folder requested by the user) as **uncompressed XML**.
2. **Calculate node sizes & spacing:**
   - Standard step: `width >= 180`, `height >= 60` (`whiteSpace=wrap;html=1;`).
   - Decision `rhombus`: `width >= 180`, `height >= 88` (usable text area is ~50%).
   - Keep `>= 70px` vertical gap and `>= 90px` horizontal gap between sibling shapes.
3. **Container & Swimlane rules:**
   - Inside a container (`parent="lane-id"`), child `(x, y)` are **relative** to the container's top-left corner, and `y >= startSize + 20`.
   - Any edge connecting nodes in **different** containers MUST set `parent="1"` (or their lowest common ancestor).
4. **Explicit port routing:**
   - Use `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;labelBackgroundColor=#FFFFFF;`.
   - Bind explicit `exitX/exitY` and `entryX/entryY` whenever a shape has 2+ edges so connectors never overlap.

### Step 3: Auto-Validate Structure & Visual Geometry (`validate --strict`)
Immediately after creating or editing a `.drawio` file, run strict validation:
```bash
python3 /Users/iannwendy/Desktop/goodNstay/.agents/skills/drawio-diagram-builder/scripts/drawio_helper.py \
  validate /absolute/path/to/diagram.drawio --strict
```
- Fix **all** `ERROR`s (broken XML, duplicate IDs, missing `source`/`target`) and `WARN`s (sibling box overlaps, container overflows, text truncation risks, cross-container edge parent bugs) **before** presenting the file to the user.
- *(Optional convenience)* If helpful or requested, generate a 1-click `app.diagrams.net` link (add `--open` only if the user asks to launch the browser):
  ```bash
  python3 /Users/iannwendy/Desktop/goodNstay/.agents/skills/drawio-diagram-builder/scripts/drawio_helper.py \
    url /absolute/path/to/diagram.drawio
  ```

---

## Self-Learning & Continuous Improvement Loop (Mandatory)

This skill is designed to **get smarter after every diagram and every user interaction**. Follow all three feedback triggers below:

### Trigger A — Explicit User Feedback or Revision Request
Whenever the user critiques a generated diagram or states a preference (e.g., *"chữ bị tràn ô"*, *"mũi tên cắt ngang qua hình"*, *"dùng swimlane ngang thay vì dọc"*, *"đổi tông màu pastel nhẹ hơn"*, *"dùng tiếng Anh cho tên API"*):
1. **Apply the fix** to the `.drawio` file and re-run `validate --strict`.
2. **Generalize the lesson** from the specific complaint into a concrete, reusable rule (with measurable numbers/styles where possible).
3. **Persist & promote the lesson immediately**:
   ```bash
   python3 /Users/iannwendy/Desktop/goodNstay/.agents/skills/drawio-diagram-builder/scripts/drawio_helper.py \
     log-feedback \
     --diagram "path/to/diagram.drawio" \
     --type style_preference \
     --issue "Short summary of what the user disliked or corrected" \
     --rule "Concrete rule to follow on all future diagrams" \
     --promote
   ```
   *(Available `--type` categories: `style_preference`, `user_correction`, `validator_catch`, `domain_convention`.)*

### Trigger B — Learning Silently from Manual User Edits (`diff-learn`)
Users frequently open a generated `.drawio` file in https://app.diagrams.net/, tweak colors/sizes/positions manually, and save it back to the project folder (note: `app.diagrams.net` may save compressed XML — `drawio_helper.py` transparently decodes both!).
- If you have a previous version (via git or backup) and notice the user edited a `.drawio` file manually, run:
  ```bash
  python3 /Users/iannwendy/Desktop/goodNstay/.agents/skills/drawio-diagram-builder/scripts/drawio_helper.py \
    diff-learn /path/to/before.drawio /path/to/after.drawio --record
  ```
- This automatically detects systematic resizing, color swaps, font-size standardization, and connector style changes, logs them to `memory/feedback_log.jsonl`, and promotes them to `memory/lessons_learned.md`.

### Trigger C — Self-Reflection & Validator Upgrades
- If you catch a subtle draw.io rendering bug during self-review that `drawio_helper.py validate` did **not** yet warn about:
  1. Log it with `--type validator_catch --promote`.
  2. When practical, add a deterministic check for that pattern inside [`scripts/drawio_helper.py`](./scripts/drawio_helper.py) (and add a test in [`tests/test_drawio_helper.py`](./tests/test_drawio_helper.py)) so no future agent run can ever regress on that mistake again.
- Periodically prune or merge duplicate bullets in [`memory/lessons_learned.md`](./memory/lessons_learned.md) so the pre-flight checklist stays concise, sharp, and contradiction-free.
