# Project map

GeDniM is a static site published from the repository root on GitHub Pages. Each mini app or game is a standalone page loaded by the site shell.

## Page flow

1. `index.html` renders the navigation and an iframe.
2. `js/app.js` loads `Home/index.html` by default and routes menu selections into the iframe.
3. Each `MiniApp/<name>/index.html` or `MiniGame/<name>/index.html` page owns its feature UI and local scripts/styles.

Keep existing route folder names stable unless every reference is updated. Paths are built around the `/miniapp/` site base.

## Top-level layout

| Path | Purpose |
| --- | --- |
| `index.html` | Site shell and navigation |
| `Home/` | Default landing page |
| `About/`, `Contact/` | Informational pages |
| `MiniApp/` | 17 mini app folders |
| `MiniGame/` | 13 mini game folders |
| `FromOtherSide/` | Additional project demo, including 2048 |
| `css/`, `js/`, `icon/` | Shared stylesheets, scripts, and icons used by the live site |
| `_archive/` | Historical backups kept in Git and omitted by Jekyll |

## Main navigation

The visible menu in `index.html` currently points to these folders.

### Mini apps

- `MiniApp/Converter`
- `MiniApp/ServerStatusMonitor`
- `MiniApp/BarQRGenerator`
- `MiniApp/HTMLEditorSuite`
- `MiniApp/Scoreboard`
- `MiniApp/Ruler`
- `MiniApp/Stopwatch`
- `MiniApp/ItemSearchSort`
- `MiniApp/T9`
- `MiniApp/Metronome`
- `MiniApp/KeyboardPiano`
- `MiniApp/NumberedNotation`
- `MiniApp/InstrumentTuner`
- `MiniApp/MermaidStudio`
- `MiniApp/MemeEditor`
- `MiniApp/TaskFlow`

### Mini games

- `MiniGame/GuessNumberGame`
- `MiniGame/MiniRPG`
- `MiniGame/RhythmGame`
- `MiniGame/MoveYourFinger`
- `MiniGame/MonsterSlayer`
- `MiniGame/FlappyBird`
- `MiniGame/FlappyBird3D`
- `MiniGame/FlappyMon`
- `MiniGame/DrawACircle`

Other folders such as `MiniApp/InstrumentTuner2`, `MiniGame/2048`, `MiniGame/ChineseChess`, `MiniGame/Jump`, and `MiniGame/MemeEditor` are present but are not linked from the visible main menus.

## Shared assets

- `css/` contains the active shared CSS, including the local Bootstrap build and `index.css`.
- `js/` contains the active shared JavaScript, including Bootstrap and `app.js`.
- `icon/` contains the icons referenced by the site and its modules.
- Individual apps may have their own `index.html`, scripts, styles, images, and external CDN dependencies.

## Historical snapshots

Old copies were moved under `_archive/` without changing their contents. A scan of the active HTML, JavaScript, CSS, and configuration files found no references to the old backup paths.

| Previous path | Archive path |
| --- | --- |
| `css_bak/` | `_archive/css/legacy/` |
| `css_bak20260617/` | `_archive/css/20260617/` |
| `js_bak/` | `_archive/js/legacy/` |
| `js_bak20260617/` | `_archive/js/20260617/` |
| `icon/feather icon backup/` | `_archive/icons/feather/` |
| Loose `*.bak` files | `_archive/loose-files/` with their original directory structure |

Jekyll omits underscore-prefixed directories from the published site, so these snapshots remain available in Git without being copied into the site output.