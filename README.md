# DrawMesh

A local-first, offline-capable whiteboard — an Excalidraw board without the
account, the share button or the live collaboration.

Everything stays on the device: the scene, the library and your preferences
live in IndexedDB, the app installs as a PWA and keeps working with the
network unplugged.

```
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
npm test           # unit tests
npm run lint       # eslint
npm run typecheck  # tsc
```

## What is DrawMesh

- The full Excalidraw canvas engine (`@excalidraw/excalidraw@0.18.1`):
  shapes, arrows, freehand, text, images, frames, laser pointer, selection,
  grouping, layers, snapping, zoom/pan, undo/redo, export, `.excalidraw`
  import/export, libraries, Mermaid, 50+ languages.
- A **DrawMesh main menu** (open, save, export, command palette, find on
  canvas, help, reset, theme, language, canvas background) with every
  account-related entry removed.
- A **DrawMesh welcome screen** that tells the user the truth: the drawing
  is stored on this device and no account is needed.
- A **command palette** (Cmd+/) with the app's own commands, because the
  package ships the component but never renders it.
- **Local-first persistence** in IndexedDB, with a debounced autosave.
- A **PWA** — installable, offline, with every font served locally.

## Architecture

```
src/
├── App.tsx                     canvas host, persistence, preferences
├── components/
│   ├── CommandPalette.tsx      the command palette (Cmd+/)
│   ├── DrawMeshLogo.tsx        the brand mark
│   ├── DrawMeshMainMenu.tsx    the main menu, tunneled into the canvas chrome
│   ├── DrawMeshTopRightUI.tsx  brand + save indicator
│   ├── DrawMeshWelcomeScreen.tsx
│   └── ToolbarKeybindingParity.tsx   letters instead of numbers on tools
├── features/commands.ts        the command registry
├── hooks/                      preferences and save status
├── lib/                        storage (IndexedDB) and scene (de)serialisation
└── styles/                     brand tokens and DrawMesh-specific CSS
```

### The two extension points

The Excalidraw package renders its own chrome. DrawMesh replaces two pieces
of it by passing React children to `<Excalidraw>`: the children are rendered
inside the app's own contexts, and the package's _tunnel_ mechanism routes
them into the canvas chrome.

- `<MainMenu>` → `MainMenuTunnel` → replaces the built-in main menu.
- `<WelcomeScreen>` → `WelcomeScreenCenterTunnel` → replaces the built-in
  welcome screen.

The package's own `MainMenu.DefaultItems.*` are reused for every entry, so
the menu is pixel-identical to the reference except for the items DrawMesh
deliberately omits.

## Parity with excalidraw.com

`docs/parity-spec.md` documents the reference capture, the exact tool set,
the menu structure, the theme tokens, the file formats and the evidence log.
`docs/reference/` holds the excalidraw.com screenshots and
`docs/drawmesh/` the DrawMesh ones.

Measure the difference with a Chromium on `CDP_PORT` (default 9222):

```
node scripts/capture-ui.mjs docs/reference      # capture excalidraw.com
node scripts/capture-drawmesh.mjs               # capture DrawMesh
node scripts/compare-screenshots.mjs             # pixel diff
```

Current result: **5.65 % mean changed pixels** across the welcome screen
(light and dark), the main menu, the help dialog, the export dialog, the
command palette and the search sidebar.

### Known deviations

| Deviation                                                       | Why                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| The toolbar has no _sticky note_ tool                           | It does not exist in `0.18.1`; it is newer than the published package.                        |
| The _image_ tool sits in the main toolbar                       | The reference moved it into the overflow menu, which the package does not allow us to extend. |
| The overflow trigger is the package's icon, not `⋮`             | Package-internal.                                                                             |
| The help dialog has no _sticky note_ / _bucket fill_ rows       | Newer than the published package.                                                             |
| The top-right shows a DrawMesh brand mark and a save indicator  | Replaces the "Try Excalidraw+" banner and the "Share" button.                                 |
| The welcome screen shows the DrawMesh logo and local-first copy | Branding.                                                                                     |

Two deliberate visual patches bridge version gaps:

- `ToolbarKeybindingParity` rewrites the toolbar's keybinding badge from the
  number (`1`) to the letter (`V`) the reference shows. It writes a
  `data-parity-key` attribute and renders it with CSS, so a React re-render
  cannot undo it.
- `src/styles/theme.css` overrides the brand hue and the modal scrim to
  match the reference.

## Offline

`vite-plugin-pwa` generates the service worker and the precache manifest.
The hand-drawn fonts are copied from the package into `public/fonts/` and
served locally, and `window.EXCALIDRAW_ASSET_PATH` points the package at
them — without it the package would fetch the fonts from a CDN and the app
would break offline.

The CJK face (≈13 MB across 200 subset files) is deliberately **not**
precached; it is fetched on demand the first time CJK text is used.

## Privacy

No account, no server, no telemetry, no network calls. The only outbound
requests the app can make are the ones the user triggers: loading a remote
image they insert, and fetching a font that was not precached.
