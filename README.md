# GeDniM Portal

A responsive home for the GeDniM mini apps, games, and experiments.

## Structure

- `index.html` contains the shared portal and project workspace.
- `apps.json` is the source for the navigation, category groups, and project cards.
- `css/site.css` contains the custom responsive design for the portal.
- `js/site.js` handles navigation, search, grouping, and opening projects.
- `backups/` preserves earlier page sources for rollback.

## Preview locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. The project cards and navigation are generated from `apps.json`.

## Published site

https://ymhomer.github.io/miniapp/
