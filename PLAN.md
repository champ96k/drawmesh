# DrawMesh — Build Plan

> **Status: implemented.** See `README.md` for the architecture and
> `docs/parity-spec.md` for the measured parity against excalidraw.com
> (6.16 % mean changed pixels across 7 views). `scripts/verify.mjs` runs
> 23 end-to-end checks against the production build.

Scope: **board only**. No login, no share, no realtime. Use `@excalidraw/excalidraw`, rebranded as **DrawMesh**.

Location: `/Users/tusharnikam/Projects/drawmesh`

## Stack

- Vite + React 19 + TypeScript (SPA)
- `@excalidraw/excalidraw` (+ `index.css`) for the canvas engine
- `localforage` (IndexedDB) for local-first autosave; jotai or React state for UI
- Vitest + Testing Library; ESLint + Prettier

## How REA is used (parity extraction, not authoring)

1. **Browser observation** of `https://excalidraw.com`: page structure, screenshots of the
   default UI, left panel, hamburger menu, export dialog, help dialog, command palette,
   welcome screen.
2. **Network captures**: assets, fonts, library JSON, `.excalidraw` file schema
   (Firebase/collab endpoints ignored).
3. **JS bundle analysis** (`rea analyze-javascript-application` on downloaded site chunks):
   enumerated tool order, color palette hex values, keyboard shortcut map, export options,
   theme tokens, localStorage keys, i18n locale list.
4. **Package/artifact inspection**: `.excalidrawlib` library format, `.excalidraw` file schema.
5. Write findings to `docs/parity-spec.md` with evidence; use it as the build spec.
6. **Visual parity check**: screenshot DrawMesh vs excalidraw.com and diff, then adjust.

Note: REA MCP tools only load after opencode restarts (config loads at startup).

## What the package gives us (free)

Infinite canvas, all shape tools, freedraw, text, arrows/binding, images, frames,
laser pointer, eraser, selection/lasso, grouping, align/distribute, layers, locking,
grid/snap, undo/redo, zoom/pan, context menu, hotkeys, theme, PNG/SVG/JSON export,
`.excalidraw` import, shape libraries, Mermaid, i18n, fonts.

## What we rebuild to match excalidraw.com

Top bar (hamburger menu, DrawMesh logo, undo/redo, zoom, theme), **welcome screen**,
**export dialog**, **command palette**, **help dialog**, **library panel**,
local autosave / PWA shell.

## File structure

```
drawmesh/
  index.html · vite.config.ts · tsconfig.json · package.json
  public/            logo.svg, favicon, fonts, manifest
  src/
    main.tsx · App.tsx
    components/  Board.tsx Header.tsx Menu.tsx WelcomeScreen.tsx
                 ExportDialog.tsx HelpDialog.tsx CommandPalette.tsx LibraryPanel.tsx
    state/       scene.ts (localforage autosave) theme.ts
    features/    import/ export/ library/ hotkeys/
    styles/      theme.css
  docs/parity-spec.md   (REA evidence + feature checklist)
  README.md
```

## Phases

- **P0 – REA research** (after restart): run the analysis above, produce
  `docs/parity-spec.md` + reference screenshots.
- **P1 – Scaffold**: Vite React TS app, install deps, render `<Excalidraw>` full-screen,
  import CSS, verify dev server.
- **P2 – Board parity**: default scene + tool order/palette/theme tokens, left panel,
  top bar, hotkeys, context menu, dark mode.
- **P3 – App shell**: welcome screen, hamburger menu, export dialog
  (PNG/SVG/JSON/clipboard), import, libraries, command palette, help, i18n, Mermaid.
- **P4 – Persistence/polish**: localforage autosave + restore, DrawMesh branding
  (logo, title, favicon, metadata), PWA/offline, fonts bundled.
- **P5 – Verify**: REA screenshot diff vs excalidraw.com; manual QA checklist;
  `npm run typecheck && npm run lint && npm run build && npm run test`.

## Notes / risks

- `.excalidraw` is MIT: keep its license notice, do **not** use the Excalidraw trademark
  (we use DrawMesh).
- Some excalidraw.com app features live outside the npm package and must be re-created
  to look identical.
- Fully frontend-only, no backend/DB; everything persists in the browser.

## Status

- [x] REA installed (rea-agents 6.7.0) and MCP registered for opencode
- [x] Plan saved
- [ ] P0 REA research
- [ ] P1 Scaffold
- [ ] P2 Board parity
- [ ] P3 App shell
- [ ] P4 Persistence/polish
- [ ] P5 Verify
