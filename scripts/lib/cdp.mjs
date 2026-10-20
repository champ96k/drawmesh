// Minimal Chrome DevTools Protocol client used to capture local reference
// material for the DrawMesh parity spec. Uses Node's global WebSocket
// (Node >= 22) so the project needs no extra dependency.

import { writeFileSync } from "node:fs";

// Node >= 22 exposes a global WHATWG WebSocket client; no dependency needed.
const { WebSocket } = globalThis;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Cdp {
  constructor(ws, targetId) {
    this.ws = ws;
    this.targetId = targetId;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
        // The canvas registers a `beforeunload` handler, so navigating away
        // with unsaved changes opens a native dialog. Left open it blocks
        // the renderer and swallows every later input event.
        if (msg.method === "Page.javascriptDialogOpening") {
          this.send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
        }
      }
    });
  }

  static async connect(targetId) {
    const url = `ws://127.0.0.1:${PORT}/devtools/page/${targetId}`;
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    return new Cdp(ws, targetId);
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async setViewport(width, height, scale = 2) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: scale,
      mobile: false,
    });
  }

  async goto(url, waitMs = 6000) {
    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Page.navigate", { url });
    await sleep(waitMs);
    // The window must be frontmost or Chrome drops synthesised input.
    await this.send("Page.bringToFront");
    await sleep(400);
  }

  async eval(expression, awaitPromise = true) {
    const res = await this.send("Runtime.evaluate", {
      expression: `(async () => { ${expression} })()`,
      awaitPromise,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        `eval failed: ${JSON.stringify(res.exceptionDetails.exception?.description || res.exceptionDetails)}`,
      );
    }
    return res.result?.value;
  }

  async click(x, y, { clickCount = 1, button = "left" } = {}) {
    const base = { x, y, button, clickCount, buttons: 1, pointerType: "mouse" };
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
      button: "none",
      buttons: 0,
      pointerType: "mouse",
    });
    await this.send("Input.dispatchMouseEvent", { ...base, type: "mousePressed" });
    await sleep(50);
    await this.send("Input.dispatchMouseEvent", {
      ...base,
      type: "mouseReleased",
      buttons: 0,
    });
    await sleep(250);
  }

  async pressKey(key, { code, keyCode, text, modifiers = 0 } = {}) {
    const params = { key, code, windowsVirtualKeyCode: keyCode, modifiers };
    await this.send("Input.dispatchKeyEvent", {
      type: text ? "keyDown" : "rawKeyDown",
      ...params,
      ...(text ? { text } : {}),
    });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...params });
    await sleep(250);
  }

  async clickSelector(selector, index = 0) {
    const box = await this.eval(`return (() => {
      const els = document.querySelectorAll(${JSON.stringify(selector)});
      const el = els[${index}];
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
    })()`);
    if (!box) throw new Error(`selector not found: ${selector} [${index}]`);
    await this.click(box.x, box.y);
    return box;
  }

  async drag(x1, y1, x2, y2, steps = 12) {
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: x1,
      y: y1,
      button: "none",
      buttons: 0,
      pointerType: "mouse",
    });
    await this.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: x1,
      y: y1,
      button: "left",
      clickCount: 1,
      buttons: 1,
      pointerType: "mouse",
    });
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      await this.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
        button: "left",
        buttons: 1,
        pointerType: "mouse",
      });
      await sleep(14);
    }
    await this.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: x2,
      y: y2,
      button: "left",
      clickCount: 1,
      buttons: 0,
      pointerType: "mouse",
    });
    await sleep(250);
  }

  /**
   * Dispatches a keyboard event from the page itself. Chrome drops some
   * synthesised key events (notably Escape while a text field inside a
   * portal has the focus), so the harness uses the DOM event instead.
   */
  async syntheticKey(key, { code, keyCode, modifiers = 0 } = {}) {
    await this.eval(`
      const target = document.activeElement || document.body;
      const event = new KeyboardEvent('keydown', {
        key: ${JSON.stringify(key)},
        code: ${JSON.stringify(code ?? key)},
        keyCode: ${keyCode ?? 0},
        which: ${keyCode ?? 0},
        bubbles: true,
        cancelable: true,
        composed: true,
        metaKey: ${Boolean(modifiers & 4)},
        ctrlKey: ${Boolean(modifiers & 2)},
        shiftKey: ${Boolean(modifiers & 8)},
        altKey: ${Boolean(modifiers & 1)},
      });
      target.dispatchEvent(event);
      return true;
    `);
    await sleep(300);
  }

  async key(key, { code, keyCode, text, modifiers = 0 } = {}) {
    await this.send("Input.dispatchKeyEvent", {
      type: text ? "keyDown" : "rawKeyDown",
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      text,
      modifiers,
    });
    await this.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode: keyCode,
      modifiers,
    });
    await sleep(300);
  }

  async shot(path) {
    const { data } = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    writeFileSync(path, Buffer.from(data, "base64"));
    return path;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* already closed */
    }
  }
}

const PORT = process.env.CDP_PORT || "9222";

export async function http(path, method = "GET") {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`, { method });
  return res.json();
}

export async function findOrCreateTarget() {
  const list = await http("/json/list");
  const targetInfos = Array.isArray(list) ? list : list.targetInfos || [];
  const existing = targetInfos.find(
    (t) =>
      t.type === "page" &&
      !t.url.startsWith("devtools://") &&
      !t.url.startsWith("chrome://"),
  );
  if (existing) return existing.id;
  // Chrome only accepts PUT for /json/new.
  const { targetId } = await http(
    `/json/new?${encodeURIComponent("about:blank")}`,
    "PUT",
  );
  return targetId;
}
