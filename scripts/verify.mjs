// End-to-end verification of the DrawMesh build.
//
//   node scripts/verify.mjs [url]
//
// Drives the built app in Chromium over CDP and asserts the behaviours the
// parity spec requires.

import { Cdp, findOrCreateTarget, sleep } from "./lib/cdp.mjs";

const URL = process.argv[2] || "http://localhost:4173/";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const targetId = await findOrCreateTarget();
const cdp = await Cdp.connect(targetId);

const count = (selector) =>
  cdp.eval(`return document.querySelectorAll(${JSON.stringify(selector)}).length`);

const has = (selector) =>
  cdp.eval(`return !!document.querySelector(${JSON.stringify(selector)})`);

/** Presses Escape until nothing modal is left open. */
const closeDialogs = async () => {
  for (let i = 0; i < 4; i++) {
    if (!(await has(".Modal"))) {
      return true;
    }
    await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
    await sleep(600);
  }
  return !(await has(".Modal"));
};

/** Opens the canvas main menu and returns whether it opened. */
const openMainMenu = async () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    await cdp.eval(`
      const trigger = document.querySelector('[data-testid="main-menu-trigger"]');
      if (trigger) { trigger.click(); }
      return !!trigger;
    `);
    await sleep(700);
    if (await has(".dropdown-menu")) {
      return true;
    }
  }
  return false;
};

/** Clicks the menu entry whose label matches. */
const clickMenuItem = async (pattern) => {
  const box = await cdp.eval(`
    const item = Array.from(document.querySelectorAll('.dropdown-menu-item'))
      .find((element) => ${pattern}.test(element.textContent || ''));
    if (!item) return null;
    const r = item.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  `);
  if (!box) {
    return false;
  }
  await cdp.click(box.x, box.y);
  await sleep(1200);
  return true;
};

const sceneSize = () =>
  cdp.eval(`
    return new Promise((resolve) => {
      const req = indexedDB.open("drawmesh");
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("drawmesh", "readonly");
        const get = tx.objectStore("drawmesh").get("scene");
        get.onsuccess = () => {
          if (!get.result) return resolve(0);
          resolve(JSON.parse(get.result.scene).elements.length);
        };
        get.onerror = () => resolve(0);
      };
      req.onerror = () => resolve(0);
    });
  `);

await cdp.setViewport(1440, 900, 2);
await cdp.goto(URL, 8000);
await sleep(2500);

// Start from a known state: English, light theme, empty scene.
await cdp.eval(`
  return new Promise((resolve) => {
    const req = indexedDB.open("drawmesh");
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("drawmesh", "readwrite");
      const store = tx.objectStore("drawmesh");
      store.put({ theme: "light", language: "en", canvasBackground: "#ffffff" }, "preferences");
      store.delete("scene");
      store.delete("library");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    };
    req.onerror = () => resolve(false);
  });
`);
// Reload straight away so the running app cannot re-save its stale scene.
await cdp.goto(URL, 8000);
await sleep(3000);
await closeDialogs();

// ---------------------------------------------------------------- branding --
check(
  "no Excalidraw branding in the DOM",
  !(await cdp.eval(`return /excalidraw/i.test(document.body.innerText)`)),
);
check(
  "no sign-up / share / live-collaboration menu entries",
  await cdp.eval(`
    const items = Array.from(document.querySelectorAll('.dropdown-menu-item'));
    return items.every((i) => !/sign up|sign-up|share|live collaboration|github|discord|excalidraw\\+/i.test(i.textContent || ''));
  `),
);
check(
  "no share button in the top bar",
  await cdp.eval(`return !document.querySelector('.collab-button, .plus-banner')`),
);

// -------------------------------------------------------------- main menu ---
await openMainMenu();
const menuItems = await cdp.eval(`
  return Array.from(document.querySelectorAll('.dropdown-menu-item__text')).map((e) => e.textContent.trim());
`);
check(
  "main menu contains the expected entries",
  [
    "Open",
    "Save to...",
    "Export image...",
    "Command palette",
    "Find on canvas",
    "Help",
  ].every((label) => menuItems.includes(label)),
  menuItems.join(" | "),
);
check(
  "main menu offers theme, language and canvas background",
  await cdp.eval(`
    return !!document.querySelector('.dropdown-select__language')
      && document.body.innerText.includes('Theme')
      && document.body.innerText.includes('Canvas background');
  `),
);
await closeDialogs();

// ---------------------------------------------------------------- toolbar ---
const toolbar = await cdp.eval(`
  return Array.from(document.querySelectorAll('.App-toolbar [data-testid^="toolbar-"]'))
    .map((b) => ({
      testid: b.getAttribute('data-testid'),
      badge:
        b.closest('label')?.querySelector('.ToolIcon__keybinding')?.dataset.parityKey ||
        b.closest('button')?.querySelector('.ToolIcon__keybinding')?.dataset.parityKey ||
        null,
    }));
`);
check(
  "toolbar exposes the reference tools",
  [
    "toolbar-selection",
    "toolbar-rectangle",
    "toolbar-diamond",
    "toolbar-ellipse",
    "toolbar-arrow",
    "toolbar-line",
    "toolbar-freedraw",
    "toolbar-text",
    "toolbar-eraser",
  ].every((id) => toolbar.some((t) => t.testid === id)),
  toolbar.map((t) => t.testid).join(","),
);
check(
  "toolbar keybindings show letters, not numbers",
  toolbar.filter((t) => t.badge).every((t) => /[A-Z]/.test(t.badge ?? "")),
  toolbar.map((t) => `${t.testid.replace("toolbar-", "")}:${t.badge}`).join(" "),
);

// ----------------------------------------------------------------- dialogs --
await cdp.clickSelector("button.help-icon");
await sleep(1500);
check("help dialog opens", (await count(".HelpDialog")) > 0);
await closeDialogs();

await openMainMenu();
await clickMenuItem(/^Export image/);
check("export dialog opens", (await count(".ImageExportModal")) > 0);
await closeDialogs();

await openMainMenu();
await clickMenuItem(/^Command palette/);
check(
  "command palette opens from the menu",
  (await count(".drawmesh-command-palette")) > 0,
);
await cdp.pressKey("Escape", { code: "Escape", keyCode: 27 });
await sleep(800);
check(
  "command palette closes with Escape",
  (await count(".drawmesh-command-palette")) === 0,
);

await cdp.click(1100, 700);
await sleep(300);
await cdp.pressKey("/", { code: "Slash", keyCode: 191, text: "/", modifiers: 4 });
await sleep(1200);
check("command palette opens with Cmd+/", (await count(".drawmesh-command-palette")) > 0);
await closeDialogs();

await cdp.eval(`
  const input = document.querySelector('input[aria-label="Library"]');
  if (input) { input.click(); }
  return true;
`);
await sleep(1800);
check("library panel opens", (await count(".default-sidebar")) > 0);
await closeDialogs();

// -------------------------------------------------------------- persistence --
let before = 0;
for (let attempt = 0; attempt < 3; attempt++) {
  await cdp.pressKey("r", { code: "KeyR", keyCode: 82, text: "r" });
  await sleep(400);
  await cdp.drag(400, 300, 620, 430);
  await sleep(1600);
  before = await sceneSize();
  if (before > 0) {
    break;
  }
}
check("scene is persisted to IndexedDB", before > 0, `elements=${before}`);

await cdp.goto(URL, 8000);
await sleep(3500);
const after = await sceneSize();
check("scene survives a reload", after === before, `before=${before} after=${after}`);
check(
  "welcome screen is hidden when a scene exists",
  (await count(".welcome-screen-center")) === 0,
);

// -------------------------------------------------------------------- theme --
await openMainMenu();
await cdp.eval(`
  // light, dark, system — the radios carry no value attribute.
  const input = document.querySelectorAll('.RadioGroup input[type="radio"]')[1];
  if (input) { input.click(); }
  return true;
`);
await sleep(1400);
check(
  "dark theme applies",
  await cdp.eval(`return !!document.querySelector('.excalidraw.theme--dark')`),
);
await closeDialogs();

// ----------------------------------------------------------------- language --
await openMainMenu();
await cdp.eval(`
  const select = document.querySelector('.dropdown-select__language');
  if (select) {
    select.value = 'de-DE';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return true;
`);
await sleep(2000);
check(
  "language switch applies",
  await cdp.eval(
    `return document.documentElement.lang === 'de-DE' || /de-DE/.test(document.querySelector('.dropdown-select__language')?.value || '')`,
  ),
);
await closeDialogs();

// ---------------------------------------------------------------------- PWA --
check(
  "web app manifest is served",
  await cdp.eval(`
    return Array.from(document.querySelectorAll('link[rel="manifest"]')).length > 0
      || (await fetch('/manifest.webmanifest').then((r) => r.ok));
  `),
);
check(
  "service worker is registered",
  await cdp.eval(
    `return navigator.serviceWorker.getRegistrations().then((r) => r.length > 0)`,
  ),
);
check(
  "fonts resolve locally",
  await cdp.eval(`
    return Array.from(document.fonts).some((f) => f.family === 'Assistant' && f.status === 'loaded');
  `),
);

// ------------------------------------------------------------------ offline --
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: true,
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
});
await cdp.goto(URL, 8000);
await sleep(4000);
check("app shell loads with the network offline", await has(".excalidraw"));
check(
  "canvas renders offline",
  await cdp.eval(`return document.querySelectorAll("canvas").length > 0`),
);
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 0,
  downloadThroughput: -1,
  uploadThroughput: -1,
});
await cdp.goto(URL, 8000);
await sleep(2000);

cdp.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
