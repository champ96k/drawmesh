import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom does not implement matchMedia, which the theme hook relies on.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom has no canvas backend, and the Excalidraw package probes the 2d
// context at import time (`"filter" in context`). A minimal stub keeps the
// module importable in unit tests.
if (typeof HTMLCanvasElement !== "undefined") {
  const stubContext = () =>
    ({
      filter: "none",
      fillStyle: "#000000",
      strokeStyle: "#000000",
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      lineWidth: 1,
      lineCap: "butt",
      lineJoin: "miter",
      miterLimit: 10,
      shadowBlur: 0,
      shadowColor: "rgba(0, 0, 0, 0)",
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      font: "10px sans-serif",
      textAlign: "start",
      textBaseline: "alphabetic",
      imageSmoothingEnabled: true,
      save() {},
      restore() {},
      scale() {},
      rotate() {},
      translate() {},
      transform() {},
      setTransform() {},
      resetTransform() {},
      clearRect() {},
      fillRect() {},
      strokeRect() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      bezierCurveTo() {},
      quadraticCurveTo() {},
      arc() {},
      arcTo() {},
      ellipse() {},
      rect() {},
      roundRect() {},
      fill() {},
      stroke() {},
      clip() {},
      isPointInPath() {
        return false;
      },
      drawImage() {},
      createLinearGradient() {
        return { addColorStop() {} };
      },
      createRadialGradient() {
        return { addColorStop() {} };
      },
      createPattern() {
        return null;
      },
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(Math.max(w, 0) * Math.max(h, 0) * 4),
        width: w,
        height: h,
        colorSpace: "srgb" as const,
      }),
      putImageData() {},
      createImageData: (_x: number, _y: number, w = 1, h = 1) => ({
        data: new Uint8ClampedArray(Math.max(w, 0) * Math.max(h, 0) * 4),
        width: w,
        height: h,
        colorSpace: "srgb" as const,
      }),
      measureText: (text: string) => ({
        width: text.length * 6,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: text.length * 6,
        fontBoundingBoxAscent: 8,
        fontBoundingBoxDescent: 2,
      }),
      fillText() {},
      strokeText() {},
      setLineDash() {},
      getLineDash() {
        return [];
      },
    }) as unknown as CanvasRenderingContext2D;

  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
  ) {
    if (contextId === "2d") {
      return stubContext();
    }
    return null;
  } as unknown as HTMLCanvasElement["getContext"];

  HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
}
