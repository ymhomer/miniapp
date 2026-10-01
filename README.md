# GeDniM

GeDniM is a collection of browser-based mini apps and games by ymhomer.

- **Live site:** [ymhomer.github.io/miniapp](https://ymhomer.github.io/miniapp/)
- **Technology:** HTML, CSS, and JavaScript, with shared Bootstrap assets and libraries used by individual pages.
- **Build:** No root package manifest or build step is required.

## Project contents

The repository contains 17 mini app folders and 13 mini game folders. The main navigation currently links 16 apps and 9 games; other modules remain in the repository as standalone or experimental pages.

See the [project map](docs/PROJECT_MAP.md) for the page flow, route groups, shared assets, and archived snapshots.

## Run locally

Keep the checkout in a folder named `miniapp`, start a static server from its parent folder, and open the repository path:

1. From the parent folder, run `python3 -m http.server 8000`.
2. Open `http://localhost:8000/miniapp/`.

No dependency installation is needed. The site uses the `/miniapp/` path, as it does on GitHub Pages.

## License and credits

Created by ymhomer (默易寒). See [LICENSE.md](LICENSE.md) for the project license and third-party notices.