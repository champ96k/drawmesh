// Pixel-compares DrawMesh screenshots against the excalidraw.com reference.
//
//   node scripts/compare-screenshots.mjs [referenceDir] [drawmeshDir]
//
// Both images are decoded in the browser (no image library needed) and the
// changed-pixel ratio is reported per pair.

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { Cdp, findOrCreateTarget, sleep } from "./lib/cdp.mjs";

const ROOT = resolve(process.argv[2] || ".");
const REFERENCE_DIR = process.argv[3] || "docs/reference";
const DRAWMESH_DIR = process.argv[4] || "docs/drawmesh";

const MIME = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
};

const server = createServer((req, res) => {
  const path = join(ROOT, normalize(decodeURIComponent(req.url.split("?")[0])));
  try {
    const stat = statSync(path);
    if (!stat.isFile()) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[extname(path)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    createReadStream(path).pipe(res);
  } catch {
    res.writeHead(404).end("not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const targetId = await findOrCreateTarget();
const cdp = await Cdp.connect(targetId);
await cdp.setViewport(1440, 900, 1);
await cdp.goto(`${base}/`, 1500);

// [reference file, drawmesh file]
const pairs = [
  ["01-welcome-light.png", "01-welcome-light.png"],
  ["02-welcome-dark.png", "02-welcome-dark.png"],
  ["05-main-menu-light.png", "03-main-menu-light.png"],
  ["07-help-dialog-light.png", "04-help-dialog-light.png"],
  ["08-export-dialog-light.png", "05-export-dialog-light.png"],
  ["09-command-palette-light.png", "06-command-palette-light.png"],
  ["06-library-panel-light.png", "07-library-panel-light.png"],
];

const results = [];
for (const [reference, drawmesh] of pairs) {
  const outcome = await cdp.eval(`
    const load = async (src) => {
      const response = await fetch(src);
      if (!response.ok) throw new Error("fetch failed: " + src);
      const blob = await response.blob();
      return createImageBitmap(blob);
    };
    const a = await load(${JSON.stringify(`${base}/${REFERENCE_DIR}/${reference}`)});
    const b = await load(${JSON.stringify(`${base}/${DRAWMESH_DIR}/${drawmesh}`)});
    const width = Math.min(a.width, b.width);
    const height = Math.min(a.height, b.height);
    const canvasA = new OffscreenCanvas(width, height);
    const canvasB = new OffscreenCanvas(width, height);
    const ctxA = canvasA.getContext("2d");
    const ctxB = canvasB.getContext("2d");
    ctxA.drawImage(a, 0, 0);
    ctxB.drawImage(b, 0, 0);
    const dataA = ctxA.getImageData(0, 0, width, height).data;
    const dataB = ctxB.getImageData(0, 0, width, height).data;
    let changed = 0;
    let totalDelta = 0;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let i = 0; i < dataA.length; i += 4) {
      const d = Math.abs(dataA[i] - dataB[i]) + Math.abs(dataA[i+1] - dataB[i+1]) + Math.abs(dataA[i+2] - dataB[i+2]);
      if (d > 24) {
        changed++;
        const p = i / 4;
        const x = p % width;
        const y = (p - x) / width;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      totalDelta += d;
    }
    const pixels = width * height;
    const sample = (x, y) => {
      const i = (y * width + x) * 4;
      return [dataA[i], dataA[i+1], dataA[i+2], dataB[i], dataB[i+1], dataB[i+2]];
    };
    return {
      samples: {
        topLeft: sample(20, 20),
        topRight: sample(width - 20, 20),
        bottomLeft: sample(20, height - 20),
        center: sample(Math.floor(width / 2), Math.floor(height / 2)),
      },
      width, height,
      changedRatio: changed / pixels,
      meanDelta: totalDelta / (pixels * 3),
      diffBox: maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    };
  `);
  results.push({ reference, ...outcome });
  console.log("   samples:", JSON.stringify(outcome.samples));
  const box = outcome.diffBox
    ? `diff@${outcome.diffBox.x},${outcome.diffBox.y} ${outcome.diffBox.w}×${outcome.diffBox.h}`
    : "no diff";
  console.log(
    `${reference.padEnd(32)} changed ${(outcome.changedRatio * 100).toFixed(2).padStart(6)}%  meanΔ ${outcome.meanDelta.toFixed(1).padStart(6)}  ${box}`,
  );
}

const mean = results.reduce((sum, r) => sum + r.changedRatio, 0) / results.length;
console.log(`\nmean changed-pixel ratio: ${(mean * 100).toFixed(2)}%`);

cdp.close();
server.close();
process.exit(0);
