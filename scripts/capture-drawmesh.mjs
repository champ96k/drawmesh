// Captures DrawMesh screenshots for the parity comparison.
//
//   node scripts/capture-drawmesh.mjs [url] [outputDir]
//
// Requires a Chromium instance listening on CDP_PORT (default 9222).
// The scene stays empty for every capture so the images are comparable with
// the excalidraw.com reference.

import { mkdirSync } from "node:fs";
import { Cdp, findOrCreateTarget, sleep } from "./lib/cdp.mjs";

const URL = process.argv[2] || "http://localhost:4173/";
const OUT = process.argv[3] || "docs/drawmesh";
const W = 1440;
const H = 900;

mkdirSync(OUT, { recursive: true });

const targetId = await findOrCreateTarget();
const cdp = await Cdp.connect(targetId);

const captured = [];
const capture = async (name) => {
  await cdp.shot(`${OUT}/${name}.png`);
  captured.push(name);
  console.log("captured", name);
};

const openMainMenu = async () => {
  // Idempotent: clicking the trigger toggles the menu, so only click it when
  // the menu is currently closed.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await cdp.eval(`return !!document.querySelector('.dropdown-menu')`)) {
      return true;
    }
    await cdp.eval(`
      const trigger = document.querySelector('[data-testid="main-menu-trigger"]');
      if (trigger) { trigger.click(); }
      return !!trigger;
    `);
    await sleep(700);
    if (await cdp.eval(`return !!document.querySelector('.dropdown-menu')`)) {
      return true;
    }
  }
  return false;
};

/**
 * Switches the theme through the app's own menu so the preference is
 * persisted exactly the way a user would do it.
 *
 * The radios carry no value attribute, so they are addressed by position —
 * light, dark, system — which keeps this locale-independent.
 */
const THEME_INDEX = { light: 0, dark: 1, system: 2 };

const setTheme = async (mode) => {
  await openMainMenu();
  await cdp.eval(`
    const inputs = document.querySelectorAll('.RadioGroup input[type="radio"]');
    const input = inputs[${THEME_INDEX[mode]}];
    if (input) { input.click(); }
    return !!input;
  `);
  await sleep(1200);
  await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
  await sleep(500);
  await waitForPersisted("theme", mode);
};

/** Waits until the given preference has actually reached IndexedDB, so a
 *  reload cannot race the write. */
const waitForPersisted = async (key, value) => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const stored = await cdp.eval(`
      return new Promise((resolve) => {
        const req = indexedDB.open("drawmesh");
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("drawmesh", "readonly");
          const get = tx.objectStore("drawmesh").get("preferences");
          get.onsuccess = () => resolve(get.result ? get.result[${JSON.stringify(key)}] : null);
          get.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      });
    `);
    if (stored === value) {
      return true;
    }
    await sleep(200);
  }
  console.warn(`preference "${key}" did not persist as ${value}`);
  return false;
};

/** Switches the UI language; addressed by option value, not by label. */
const setLanguage = async (code) => {
  await openMainMenu();
  await cdp.eval(`
    const select = document.querySelector('.dropdown-select__language');
    if (select) {
      select.value = ${JSON.stringify(code)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return !!select;
  `);
  await sleep(1800);
  await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
  await sleep(500);
  await waitForPersisted("language", code);
};

/** Clears the stored scene so every capture starts from an empty board. */
const clearScene = async () => {
  await cdp.eval(`
    return new Promise((resolve) => {
      const req = indexedDB.open("drawmesh");
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("drawmesh", "readwrite");
        tx.objectStore("drawmesh").delete("scene");
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      };
      req.onerror = () => resolve(false);
    });
  `);
  await cdp.goto(URL, 6000);
  await sleep(2000);
};

await cdp.setViewport(W, H, 2);
await cdp.goto(URL, 6000);
await sleep(2000);

// 1-2. Welcome screen in both themes.
await setLanguage("en");
await setTheme("light");
await clearScene();
await capture("01-welcome-light");

await setTheme("dark");
await clearScene();
await capture("02-welcome-dark");

await setTheme("light");
await clearScene();

// 3. Main menu.
await openMainMenu();
await capture("03-main-menu-light");
await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
await sleep(800);

// 4. Help dialog.
await cdp.clickSelector("button.help-icon");
await sleep(2000);
await capture("04-help-dialog-light");
await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
await sleep(1000);

// 5. Export dialog.
await openMainMenu();
const exportClicked = await cdp.eval(`
  const items = Array.from(document.querySelectorAll('.dropdown-menu-item'));
  const hit = items.find((i) => /export image/i.test(i.textContent || ""));
  if (!hit) return false;
  hit.click();
  return true;
`);
if (exportClicked) {
  await sleep(2200);
  await capture("05-export-dialog-light");
  await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
  await sleep(1000);
} else {
  console.warn("export dialog capture skipped");
}

// 6. Command palette.
await cdp.pressKey("/", { code: "Slash", keyCode: 191, text: "/", modifiers: 4 });
await sleep(1500);
await capture("06-command-palette-light");
await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
await sleep(800);

// 7. Library panel.
await cdp.eval(`
  const input = document.querySelector('input[aria-label="Library"]');
  if (input) { input.click(); }
  return true;
`);
await sleep(2000);
await capture("07-library-panel-light");
await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
await sleep(800);

// 8. Canvas with a drawn and selected shape.
await cdp.pressKey("r", { code: "KeyR", keyCode: 82, text: "r" });
await sleep(300);
await cdp.drag(330, 300, 540, 430);
await sleep(500);
await cdp.pressKey("v", { code: "KeyV", keyCode: 86, text: "v" });
await sleep(300);
await cdp.pressKey("a", { code: "KeyA", keyCode: 65, text: "a", modifiers: 4 });
await sleep(800);
await capture("08-canvas-selection-light");

console.log("done:", captured.join(", "));
cdp.close();
process.exit(0);
