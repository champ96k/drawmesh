/// <reference types="vite/client" />

declare global {
  interface Window {
    /** Base URL the Excalidraw package resolves its bundled fonts from. */
    EXCALIDRAW_ASSET_PATH?: string | string[];
  }
}

export {};
