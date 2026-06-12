# Mermaid Studio

A professional Mermaid editor + viewer built with plain HTML, CSS and JavaScript.

## Features

- Mermaid code editor with line numbers
- Live preview with debounced rendering
- Template panel for Flowchart, Sequence, ERD, Gantt, Mindmap and more
- Snippet insertion
- Local autosave
- Snapshot history
- Diagram zoom, pan and fit-to-screen
- SVG export
- PNG export
- Dark professional workbench UI

## How to run

Because this project uses ES modules, open it through a local server instead of double-clicking `index.html`.

### Option 1: Python

```bash
cd mermaid-studio
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

### Option 2: VS Code

Use the Live Server extension and open `index.html`.

## Notes

- Mermaid is loaded from jsDelivr CDN: `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs`
- Internet access is required unless you replace the CDN import with a local Mermaid build.
- Workspace data and snapshots are stored in the browser's `localStorage`.
