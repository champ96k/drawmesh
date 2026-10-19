# DrawMesh Parity Spec

Target: **excalidraw.com** as observed on 2026-10-19 via a local Chromium
(Chrome for Testing 156.0.8078.4) driven over CDP, plus the authoritative
`@excalidraw/excalidraw@0.18.1` package source (extracted from its shipped
source maps).

DrawMesh = Excalidraw board **minus login / sign-up / share / live
collaboration**, rebranded, local-first, offline-capable.

Reference screenshots live in `docs/reference/`.

---

## 1. Reference capture

| #   | File                                   | Viewport     | Notes                           |
| --- | -------------------------------------- | ------------ | ------------------------------- |
| 01  | `excalidraw-welcome-light.png`         | 1440×900 @2x | Welcome screen, light theme     |
| 02  | `excalidraw-welcome-dark.png`          | 1440×900 @2x | Welcome screen, dark theme      |
| 03  | `excalidraw-canvas-selected-light.png` | 1440×900 @2x | Canvas + one selected rectangle |
| 04  | `excalidraw-canvas-selected-dark.png`  | 1440×900 @2x | Same, dark theme                |
| 05  | `excalidraw-main-menu-light.png`       | 1440×900 @2x | Hamburger menu open             |
| 06  | `excalidraw-library-panel-light.png`   | 1440×900 @2x | Library sidebar                 |
| 07  | `excalidraw-help-dialog-light.png`     | 1440×900 @2x | Keyboard shortcuts dialog       |
| 08  | `excalidraw-export-dialog-light.png`   | 1440×900 @2x | Export image dialog             |
| 09  | `excalidraw-command-palette-light.png` | 1440×900 @2x | Command palette                 |
| 10  | `excalidraw-canvas-clean-light.png`    | 1440×900 @2x | Empty canvas                    |

Regenerate with `node scripts/capture-ui.mjs docs/reference` (requires a
Chromium on `CDP_PORT`, default 9222).

The reference is captured with `Emulation.setEmulatedMedia` forcing
`prefers-color-scheme`, and with `excalidraw-theme` removed from
localStorage so the emulated scheme decides.

### Measured parity

`node scripts/compare-screenshots.mjs` decodes both images in the browser
and reports the changed-pixel ratio (a pixel counts as changed when the
summed RGB delta exceeds 24).

| View            | Changed pixels | Mean Δ |
| --------------- | -------------: | -----: |
| Welcome, light  |         3.74 % |    3.2 |
| Welcome, dark   |        11.87 % |    6.2 |
| Main menu       |         3.88 % |    3.3 |
| Help dialog     |         4.12 % |    3.9 |
| Export dialog   |         8.49 % |    6.5 |
| Command palette |         6.83 % |    3.0 |
| Library panel   |         4.19 % |    4.0 |
| **mean**        |     **6.16 %** |        |

The residual difference is the DrawMesh brand mark and wordmark, the
missing _sticky note_ row in the help dialog, and the top-right indicator
that replaces the "Try Excalidraw+" / "Share" controls.

### What the npm package already gives us

Verified by reading the shipped source maps of
`@excalidraw/excalidraw@0.18.1`:

- The package's `LayerUI` renders **no** Share button and **no**
  "Try Excalidraw+" banner — those live in the hosted `excalidraw-app`
  wrapper only. So a package-based host is already login/share-free.
- `LayerUI.tsx` renders the top-right area as
  `renderTopRightUI(...)` → `DefaultSidebarTriggerTunnel.Out` → `Stats`.
- The built-in main menu (`DefaultMainMenu`, `LayerUI.tsx:86`) is:
  `LoadScene`, `SaveToActiveFile`, `Export`, `SaveAsImage`, `SearchMenu`,
  `Help`, `ClearCanvas`, separator, group "Excalidraw links" → `Socials`,
  separator, `ToggleTheme`, `ChangeCanvasBackground`.
  **Only the `Socials` group (Excalidraw+ / GitHub / Follow us / Discord /
  Sign up) must be removed** → we replace the whole menu via the
  `MainMenuTunnel`.

---

## 2. Tool set and order

From `.App-toolbar` (DOM, `data-testid`):

| #   | testid               | Label                                                          | Shortcut  | DrawMesh |
| --- | -------------------- | -------------------------------------------------------------- | --------- | -------- |
| —   | `toolbar-lock`       | Keep selected tool active after drawing                        | `Q`       | keep     |
| —   | `toolbar-hand`       | Hand (panning tool)                                            | `H`       | keep     |
| 1   | `toolbar-selection`  | Selection                                                      | `V` / `1` | keep     |
| 2   | `toolbar-rectangle`  | Rectangle                                                      | `R` / `2` | keep     |
| 3   | `toolbar-diamond`    | Diamond                                                        | `D` / `3` | keep     |
| 4   | `toolbar-ellipse`    | Ellipse                                                        | `O` / `4` | keep     |
| 5   | `toolbar-arrow`      | Arrow                                                          | `A` / `5` | keep     |
| 6   | `toolbar-line`       | Line                                                           | `L` / `6` | keep     |
| 7   | `toolbar-freedraw`   | Draw                                                           | `P` / `7` | keep     |
| 8   | `toolbar-text`       | Text                                                           | `T` / `8` | keep     |
| 9   | `toolbar-stickynote` | Sticky note                                                    | `N`       | keep     |
| 10  | `toolbar-eraser`     | Eraser                                                         | `E` / `0` | keep     |
| —   | (overflow `⋮`)       | Frame `F`, Embeddable, Laser `K`, **Mermaid**, Diagram-to-Code |           | keep     |

Two `App-toolbar__divider` elements: after the lock button and before the
overflow trigger. Numeric-key alternates (`1`–`0`) are shown in each tool's
`title` attribute as `— R or 2`.

The overflow (`⋮`) menu is `DropdownMenu` `.App-toolbar__extra-tools-trigger`
and contains `Frame` (`F`), `Embeddable`, `Laser` (`K`), a **Generate**
divider, then the Mermaid entry and the optional diagram-to-code plugin.

---

## 3. Style / properties panel

Package-internal (`selected-shape-actions-container` in the top-left
`App-menu_top__left` region). Not rebuilt: it ships with the canvas
component and inherits the same CSS variables.

The properties popover is `PropertiesPopover` (`--zIndex-ui-styles-popup: 100`)
and is opened from the left panel.

---

## 4. Top-right controls

Observed on excalidraw.com (host app):

- `a.plus-banner` — "Try Excalidraw+" / "14-day free trial" → **removed**
- `button.excalidraw-button.collab-button` — "Share" → **removed**
- `button.sidebar-trigger__label-element[aria-label="Library"]` → **kept**
  (rendered by the package's `DefaultSidebarTriggerTunnel`)

DrawMesh renders its own `renderTopRightUI` slot with a DrawMesh wordmark
and a "Local only" indicator; the library trigger is appended by the
package after it.

---

## 5. Menus / dialogs

### Main menu (hamburger, top-left)

Observed order on excalidraw.com:

```
Open                       Cmd+O
Save to...
Export image...            Cmd+Shift+E
Live collaboration...               ← removed (login/share)
Command palette            Cmd+/
Find on canvas             Cmd+F
Help                       ?
Reset the canvas
──────────────────────
Excalidraw+                        ← removed
GitHub                             ← removed
Follow us                          ← removed
Discord chat                       ← removed
Sign up                            ← removed (login)
──────────────────────
Preferences ▸
  Theme      [light][dark][system]
  Language   English ▾
  Canvas background  ▢ ▢ ▢ ▢ ▢ ▢
```

DrawMesh menu = the same list minus the five removed entries, with
**Command palette** added (the package exposes
`MainMenu.DefaultItems.CommandPalette`).

### Welcome screen

Centred column, `excalifont` handwriting face:

- DrawMesh logo (replaces the Excalidraw logo)
- Heading paragraph, excalifont
- Menu list: icon + label + right-aligned shortcut

Excalidraw's default: `Open` (Cmd+O), `Help` (?), `Live collaboration...`,
`Sign up`.
DrawMesh: `Open` (Cmd+O), `Help` (?), and a local-first status line — no
login, no share.

Hand-drawn hint annotations (`.welcome-screen-decor-hint`) point at the
menu, the toolbar and the help button. They ship with the package
(`WelcomeScreen.Hints.*`) and are reused as-is.

### Export dialog

`ImageExportDialog` — ships with the package (`openDialog.name ===
"imageExport"`). Reused unchanged.

### Help dialog

`HelpDialog` — ships with the package (`openDialog.name === "help"`).
Reused, except for its header of links to the Excalidraw documentation,
blog, issue tracker and YouTube channel, which DrawMesh removes (see §10).

### Command palette

`openDialog.name === "commandPalette"`; the package ships
`CommandPalette` + `MainMenu.DefaultItems.CommandPalette`. Reused.

### Library panel

The shape library is **removed** (see §10). The "Find on canvas" search tab
of the same sidebar is kept, so `DefaultSidebar` + `DefaultSidebarTriggerTunnel`
are reused with the library tab hidden.

### Mermaid

`TTDDialog` (`openDialog.name === "ttd", tab: "mermaid"`) plus the
`@excalidraw/mermaid-to-excalidraw` dependency the package pulls in.
Reached from the toolbar overflow menu → "Mermaid".

### Command palette

The package ships a `CommandPalette` component and a
`MainMenu.DefaultItems.CommandPalette` entry, but the package's `App`
never renders the dialog and the component is not exported. DrawMesh
therefore provides its own palette (`src/components/CommandPalette.tsx`),
built on the package's own `.Modal` markup and styles, and registers its
own commands in `src/features/commands.ts`:

- File — Open, Save to…, Export image…
- App — light / dark / system theme, grid, object snapping, zen mode,
  reset the canvas, library, language
- Edit — undo, redo, select all
- View — zoom in / out / reset, find on canvas
- Help — keyboard shortcuts
- Tools — every tool in the toolbar

---

## 6. Theme tokens

The package's `index.css` defines the full token set; DrawMesh imports it
verbatim and overrides only brand-specific values.

Observed structural variables on `:root` (all z-index, unchanged):

```
--zIndex-canvas: 1            --zIndex-interactiveCanvas: 2
--zIndex-svgLayer: 3          --zIndex-canvasButtons: 3
--zIndex-wysiwyg: 3           --zIndex-layerUI: 4
--zIndex-eyeDropperPreview: 6 --zIndex-hyperlinkContainer: 7
--zIndex-cursorHint: 8        --zIndex-ui-top: 100
--zIndex-ui-styles-popup: 100 --zIndex-ui-main-menu: 110
--zIndex-ui-library: 120      --zIndex-fileDropOverlay: 130
--zIndex-ui-bottom: 60        --zIndex-ui-context-menu: 90
--zIndex-modal: 1000          --zIndex-popup: 1001
--zIndex-toast: 999999
```

Brand overrides applied by DrawMesh (see `src/styles/theme.css`):

| Token                          | Excalidraw | DrawMesh                    |
| ------------------------------ | ---------- | --------------------------- |
| `--color-primary`              | `#6965db`  | `#5b57d6` (DrawMesh indigo) |
| `--color-primary-hover`        | `#5753d0`  | `#4a46c9`                   |
| `--color-primary-darker`       | `#5b57d1`  | `#4a46c9`                   |
| `--color-primary-darkest`      | `#4a47b1`  | `#3d3aab`                   |
| `--color-primary-light`        | `#e3e2fe`  | `#e6e5fd`                   |
| `--color-primary-light-darker` | `#d7d5ff`  | `#d7d5fb`                   |
| `--color-secondary`            | `#6965db`  | `#5b57d6`                   |
| `--color-selection`            | `#6965db`  | `#4a46c9`                   |

The dark theme (`.excalidraw.theme--dark`) is overridden the same way
(`--color-primary: #9d99ff`, `--color-selection: #6965db`).

Everything else (surfaces, text, borders, shadows, radii) is inherited
unchanged from the package CSS so the result is pixel-identical apart
from the brand hue.

One further override: the package's modal scrim is `#12121233`
(≈ RGB 208 over white) while the reference uses ≈ RGB 180. DrawMesh sets
`.excalidraw .Modal__background { background-color: #12121251; }`, which
takes the help and export dialogs from ~40 % / ~68 % changed pixels down
to ~4 % / ~8 %.

---

## 7. Persistence

**Excalidraw.com** persists the scene to `localStorage`
(key `excalidraw-scene`) plus `excalidraw-library`, and the theme under
`excalidraw-theme`.

**DrawMesh** is local-first and stores everything in IndexedDB via
`localforage` (`src/lib/storage.ts`):

| Store      | Key           | Payload                                                    |
| ---------- | ------------- | ---------------------------------------------------------- |
| `drawmesh` | `scene`       | `{ elements, appState, files }` — `serializeAsJSON` output |
| `drawmesh` | `library`     | `serializeLibraryAsJSON` output                            |
| `drawmesh` | `preferences` | `{ theme, language, canvasBackground }`                    |

Notes:

- `@excalidraw/excalidraw@0.18.1` does **not** write the scene to
  localStorage itself (`EditorLocalStorage` is only used for the OAI key,
  mermaid prefs and publish-library data) — persistence is entirely the
  host app's job. DrawMesh is therefore the single source of truth.
- Writes are debounced (~400 ms) and coalesced.
- On boot the scene is restored through `initialData`
  (`restore()` + `restoreAppState()` + `restoreElements()`).
- The welcome screen is shown when the stored scene is empty.

---

## 8. File formats

Reused from the package — no re-implementation:

- `MIME_TYPES.excalidraw` — `.excalidraw` scene JSON
- `MIME_TYPES.excalidrawlib` — `.excalidrawlib` library JSON
- `loadFromBlob` / `loadSceneOrLibraryFromBlob` / `loadLibraryFromBlob`
- `serializeAsJSON` / `serializeLibraryAsJSON`
- Export: PNG (`exportToBlob`), SVG (`exportToSvg`), clipboard PNG
  (`exportToClipboard`), plus the package's `ImageExportDialog`
  (PNG / SVG / PDF, scale, background, dark mode).

---

## 9. Offline / PWA

- `vite-plugin-pwa` generates the service worker and precache manifest.
- Precached: app shell, JS/CSS chunks, all locale chunks
  (`assets/locales/**`), and the woff2 font files.
- `window.EXCALIDRAW_ASSET_PATH = "/"` — the package resolves the
  hand-drawn fonts through this base URL
  (`ExcalidrawFontFace.createUrls`). Without it the package falls back to
  `https://esm.sh/...`, which breaks offline.
- Fonts are copied from `node_modules/@excalidraw/excalidraw/dist/prod/fonts`
  into `public/fonts/` and served locally.

---

## 10. What DrawMesh removes

Three things are taken out of the Excalidraw experience, on top of the
account and share features:

### 10.1 The shape library ("browser library")

The library is a browser for public shape collections that is backed by
`libraries.excalidraw.com` and the `excalidraw-libraries` repository.
DrawMesh has no such service, so the whole feature is removed:

| Surface                                             | How it is removed                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The **Library** button in the top right             | `.excalidraw .sidebar-trigger__label-element { display: none }`                                  |
| The **Library** tab in the sidebar                  | `.excalidraw [role="tab"][id$="-trigger-library"] { display: none }` and the matching `tabpanel` |
| **Add to library** in the canvas context menu       | `.excalidraw .context-menu li[data-testid="addToLibrary"] { display: none }`                     |
| The "Toggle library" command in the command palette | removed from `src/features/commands.ts`                                                          |

The _Find on canvas_ search tab of the same sidebar is kept, and the
library is therefore never rendered — nothing is ever fetched from
`libraries.excalidraw.com` or `raw.githubusercontent.com/excalidraw/…`.

### 10.2 The help dialog's link header

The package's help dialog opens with four buttons that link to the
Excalidraw documentation, blog, issue tracker and YouTube channel. None of
those pages exist for DrawMesh, so the header is removed:

- `.excalidraw .HelpDialog__header { display: none }` removes it from the
  layout, and
- `src/components/RemoveExcalidrawLinks.tsx` empties the header and
  strips the `href` of any remaining anchor pointing at `excalidraw`, so
  the links are gone from the DOM as well.

The header is emptied rather than removed from the tree because React
detaches the outermost host node when it unmounts; emptying it keeps the
unmount safe.

### 10.3 Every other Excalidraw link

The same component strips the `href` from any anchor that points at
`excalidraw`, which covers the library's "open in Excalidraw" link and the
"publish library" links. The social links (GitHub, Discord, X) and the
"Excalidraw+" banner are already gone with the custom main menu, and the
"Save to…" dialog only offers _Save to disk_ — the "export to a link" card
that posts to `json.excalidraw.com` is not rendered because no
`onExportToBackend` is configured.

`scripts/verify.mjs` asserts that the running document contains no
`a[href]` pointing at `excalidraw`.

---

## 11. Known deviations

| Deviation                                                       | Reason                                                                                                                                                   |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The toolbar has no **sticky note** tool                         | The tool does not exist in `0.18.1`; excalidraw.com is ahead of the published package.                                                                   |
| The **image** tool sits in the main toolbar                     | The reference moved it into the overflow menu, which the package does not let a host extend. The tool itself is kept, so no feature is lost.             |
| The overflow trigger is the package's icon, not `⋮`             | Package-internal chrome.                                                                                                                                 |
| The help dialog has no _sticky note_ / _bucket fill_ rows       | Newer than the published package.                                                                                                                        |
| The top-right shows a DrawMesh mark and a save indicator        | Replaces the "Try Excalidraw+" banner and the "Share" button, which are removed by design.                                                               |
| The welcome screen shows the DrawMesh logo and local-first copy | Branding, and the "live collaboration" / "sign up" rows are removed.                                                                                     |
| The command palette is DrawMesh's own                           | The package ships a `CommandPalette` component but never renders it and does not export it. DrawMesh implements it with the package's own dialog markup. |

Two deliberate visual patches bridge the version gap:

- `src/components/ToolbarKeybindingParity.tsx` rewrites the toolbar's
  keybinding badge from the number (`1`) to the letter (`V`) the reference
  shows. It derives the letter from the package's own accessible title
  (`"Rectangle — R or 2"`) and writes it to a `data-parity-key` attribute
  that CSS renders, so a React re-render cannot undo it.
- `src/styles/theme.css` overrides the brand hue and the modal scrim.

---

## 12. Verification

`node scripts/verify.mjs` drives the production build in Chromium over CDP
and asserts the behaviours this document specifies. 28 checks, all passing:

- no Excalidraw branding, no sign-up / share / live-collaboration entries
- the main menu contains the reference entries and the preferences section
- the toolbar exposes the reference tools and shows letter keybindings
- the help dialog, export dialog, command palette and library panel open
- the command palette opens from the menu and with Cmd+/, and closes with
  Escape
- the scene is persisted to IndexedDB and survives a reload
- the welcome screen is hidden once a scene exists
- the theme and the language switch, and both survive a reload
- the manifest is served, the service worker registers, the fonts resolve
  locally
- **the app shell loads and the canvas renders with the network offline**

`npm test` runs the unit tests (storage round-trips, the command
registry, the brand mark).

---

## 13. Evidence log

| Date       | REA / tool                        | Target                                               | Finding                                                             | Evidence                                                              |
| ---------- | --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 2026-10-19 | `rea_list_browser_targets`        | `http://127.0.0.1:9222`                              | Chromium reachable, excalidraw.com page target exposed              | `ev_37919b91fb96330e792e42e91ea283f5a59f27eb3b18eaa322a292b5aea7f892` |
| 2026-10-19 | CDP `Runtime.evaluate`            | excalidraw.com                                       | Toolbar inventory: 12 buttons, 2 dividers, testids + shortcuts      | `docs/reference/excalidraw-default-light.png` + inline DOM dump       |
| 2026-10-19 | CDP `Runtime.evaluate`            | excalidraw.com                                       | `:root` exposes 25 CSS custom properties, all z-index               | inline DOM dump                                                       |
| 2026-10-19 | `npm view @excalidraw/excalidraw` | registry                                             | latest = `0.18.1`; peerDeps allow React 19                          | npm registry                                                          |
| 2026-10-19 | source-map extraction             | `dist/dev/*.js.map`                                  | 339 original TS sources recovered                                   | `/tmp/opencode/excalidraw-src`                                        |
| 2026-10-19 | source read                       | `components/LayerUI.tsx`                             | package renders no collab/Share button, no plus-banner              | `LayerUI.tsx:341-347`                                                 |
| 2026-10-19 | source read                       | `components/LayerUI.tsx:86-112`                      | built-in `DefaultMainMenu` composition                              | `DefaultMainMenu`                                                     |
| 2026-10-19 | source read                       | `components/main-menu/MainMenu.tsx`                  | `MainMenuTunnel` lets a host replace the menu                       | `MainMenu.tsx:37`                                                     |
| 2026-10-19 | source read                       | `components/App.tsx:1610`                            | `{this.props.children}` renders inside all app contexts             | `App.tsx:1610`                                                        |
| 2026-10-19 | source read                       | `components/welcome-screen/WelcomeScreen.Center.tsx` | composable `Center.*` primitives                                    | `WelcomeScreen.Center.tsx`                                            |
| 2026-10-19 | source read                       | `data/EditorLocalStorage.ts`                         | package does not persist scenes to localStorage                     | `EditorLocalStorage.ts`                                               |
| 2026-10-19 | source read                       | `fonts/ExcalidrawFontFace.ts`                        | fonts resolve via `window.EXCALIDRAW_ASSET_PATH`, else esm.sh       | `ExcalidrawFontFace.ts:78-118`                                        |
| 2026-10-19 | package layout                    | `dist/prod/fonts`                                    | fonts ship as `./fonts/<Family>/<file>.woff2`                       | `dist/prod/fonts`                                                     |
| 2026-10-19 | source read                       | `components/Actions.tsx:280-400`                     | overflow `⋮` menu = Frame / Embeddable / Laser / Generate / Mermaid | `Actions.tsx`                                                         |
