// Captures the Excalidraw reference screenshots used by docs/parity-spec.md.
//
//   node scripts/capture-ui.mjs [outputDir]
//
// Requires a Chromium instance listening on CDP_PORT (default 9222).

import { mkdirSync } from "node:fs";
import { Cdp, findOrCreateTarget, sleep } from "./lib/cdp.mjs";

const OUT = process.argv[2] || "docs/reference";
const URL = "https://excalidraw.com/";
const W = 1440;
const H = 900;

mkdirSync(OUT, { recursive: true });

const targetId = await findOrCreateTarget();
const cdp = await Cdp.connect(targetId);

const captured = [];
const skipped = [];
const capture = async (name) => {
  await cdp.shot(`${OUT}/${name}.png`);
  captured.push(name);
  console.log("captured", name);
};

const setTheme = async (theme) => {
  await cdp.eval(
    `localStorage.setItem("excalidraw-theme", ${JSON.stringify(theme)}); return true;`,
  );
};

const reload = async (wait = 7000) => {
  await cdp.goto(URL, wait);
};

/** Draws one rectangle so the welcome overlay is dismissed and the
 *  left properties panel becomes visible. */
const drawRectangle = async () => {
  await cdp.pressKey("r", { code: "KeyR", keyCode: 82, text: "r" });
  await sleep(300);
  await cdp.drag(330, 300, 540, 430);
  await sleep(500);
  await cdp.pressKey("v", { code: "KeyV", keyCode: 86, text: "v" });
  await sleep(300);
  await cdp.click(435, 365);
  await sleep(700);
};

await cdp.setViewport(W, H, 2);

// excalidraw.com remembers the theme in localStorage; drop it so the
// emulated colour scheme is what decides.
await cdp.eval(`
  try { localStorage.removeItem("excalidraw-theme"); } catch (e) {}
  return true;
`);

// 1-2. Welcome screen in both themes.
await setTheme("light");
await reload(9000);
await capture("01-welcome-light");

await setTheme("dark");
await reload(7000);
console.log(
  "  prefersDark:",
  await cdp.eval(`return matchMedia("(prefers-color-scheme: dark)").matches`),
);
console.log(
  "  themeClass:",
  await cdp.eval(`return document.querySelector('.excalidraw')?.className`),
);
console.log(
  "  lsTheme:",
  await cdp.eval(`return localStorage.getItem("excalidraw-theme")`),
);
await capture("02-welcome-dark");

await setTheme("light");
await reload(7000);

// 3-4. Canvas with a selected shape (left properties panel visible).
await drawRectangle();
await capture("03-canvas-shape-selected-light");

await setTheme("dark");
await reload(7000);
await drawRectangle();
await capture("04-canvas-shape-selected-dark");
await setTheme("light");
await reload(7000);

// 5. Main (hamburger) menu.
await cdp.clickSelector('[data-testid="main-menu-trigger"]');
await sleep(1200);
await capture("05-main-menu-light");
await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
await sleep(800);

// 6. Library panel.
await cdp.clickSelector(".default-sidebar-trigger");
await sleep(2500);
await capture("06-library-panel-light");
await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
await sleep(1000);

// 7. Help dialog.
await cdp.clickSelector("button.help-icon");
await sleep(2000);
await capture("07-help-dialog-light");
await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
await sleep(1000);

// 8. Export dialog (main menu -> Export image...).
await cdp.clickSelector('[data-testid="main-menu-trigger"]');
await sleep(1200);
const exportItem = await cdp.eval(`
  const items = Array.from(document.querySelectorAll('[role="menuitem"], .dropdown-menu-item, a[role="menuitem"]'));
  const hit = items.find((i) => /export/i.test(i.textContent || ""));
  if (!hit) return null;
  const r = hit.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: (hit.textContent || "").trim() };
`);
if (exportItem) {
  await cdp.click(exportItem.x, exportItem.y);
  await sleep(2000);
  await capture("08-export-dialog-light");
  await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
  await sleep(1000);
} else {
  skipped.push("08-export-dialog-light (menu item not found)");
}

// 9. Command palette.
await cdp.pressKey("`", { code: "Backquote", keyCode: 192, text: "`", modifiers: 4 });
await sleep(1500);
await capture("09-command-palette-light");
await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
await sleep(800);

// 10. Toolbar overflow menu (image / frame / laser pointer).
const moreBtn = await cdp.eval(`
  const btns = Array.from(document.querySelectorAll('.App-toolbar button'));
  const hit = btns.find((b) => !b.getAttribute('data-testid') && b.querySelector('svg'));
  if (!hit) return null;
  const r = hit.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, aria: hit.getAttribute('aria-label') };
`);
if (moreBtn) {
  await cdp.click(moreBtn.x, moreBtn.y);
  await sleep(1500);
  await capture("10-toolbar-more-menu-light");
  await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
  await sleep(800);
} else {
  skipped.push("10-toolbar-more-menu-light (button not found)");
}

// 11. Clean canvas, no welcome overlay.
await cdp.eval(`localStorage.removeItem("excalidraw-scene"); return true;`);
await reload(7000);
await cdp.pressKey("v", { code: "KeyV", keyCode: 86, text: "v" });
await cdp.drag(300, 260, 520, 400);
await cdp.pressKey("v", { code: "KeyV", keyCode: 86, text: "v" });
await cdp.click(1400, 860);
await sleep(1000);
await capture("11-canvas-clean-light");

console.log("done:", captured.join(", "));
if (skipped.length) console.log("skipped:", skipped.join(", "));
cdp.close();
process.exit(0);
