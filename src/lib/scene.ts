import {
  restore,
  restoreAppState,
  restoreElements,
  restoreLibraryItems,
  serializeAsJSON,
  serializeLibraryAsJSON,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { AppState } from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { getLibrary, getScene, setLibrary, setScene } from "./storage";

/** The persisted shape of a DrawMesh scene — the `.excalidraw` file format. */
export type StoredScene = {
  scene: string;
};

export type StoredLibrary = {
  library: string;
};

export type InitialData = {
  elements: OrderedExcalidrawElement[];
  appState: ReturnType<typeof restoreAppState>;
  libraryItems?: ReturnType<typeof restoreLibraryItems>;
};

/**
 * The export dialog defaults to 1× — matching excalidraw.com — instead of
 * the package's device-pixel-ratio default.
 */
const DEFAULT_APP_STATE = { exportScale: 1 };

/**
 * Restores the previously stored scene, if any. Returns `null` on first run
 * so the welcome screen is shown.
 */
export async function loadInitialData(): Promise<InitialData | null> {
  const [rawScene, rawLibrary] = await Promise.all([getScene(), getLibrary()]);

  if (!rawScene) {
    return null;
  }

  try {
    const parsed = JSON.parse((rawScene as StoredScene).scene) as {
      elements: OrderedExcalidrawElement[];
      appState: Record<string, unknown>;
    };

    const result: InitialData = {
      elements: restoreElements(parsed.elements, null),
      appState: {
        ...restoreAppState(parsed.appState, null),
        ...DEFAULT_APP_STATE,
      },
    };

    if (rawLibrary) {
      const library = JSON.parse((rawLibrary as StoredLibrary).library) as {
        libraryItems: Parameters<typeof restoreLibraryItems>[0];
      };
      const items = restoreLibraryItems(library.libraryItems, "unpublished");
      if (items.length) {
        result.libraryItems = items;
      }
    }

    return result;
  } catch (error) {
    console.warn("[drawmesh] could not restore the stored scene", error);
    return null;
  }
}

/** Serialises and persists the current scene. */
export function persistScene(
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
): void {
  try {
    const serialized = serializeAsJSON(elements, appState, files, "local");
    void setScene({ scene: serialized } satisfies StoredScene);
  } catch (error) {
    console.warn("[drawmesh] could not persist the scene", error);
  }
}

/** Serialises and persists the library. */
export function persistLibrary(
  libraryItems: Parameters<typeof serializeLibraryAsJSON>[0],
): void {
  try {
    const serialized = serializeLibraryAsJSON(libraryItems);
    void setLibrary({ library: serialized } satisfies StoredLibrary);
  } catch (error) {
    console.warn("[drawmesh] could not persist the library", error);
  }
}

/** Reads a `.excalidraw` / `.excalidrawlib` file dropped onto the app. */
export async function readSceneFile(blob: Blob): Promise<InitialData | null> {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text) as {
      elements?: OrderedExcalidrawElement[];
      appState?: Record<string, unknown>;
      libraryItems?: Parameters<typeof restoreLibraryItems>[0];
    };
    if (parsed && Array.isArray(parsed.elements)) {
      const result: InitialData = {
        elements: restoreElements(parsed.elements, null),
        appState: restoreAppState(parsed.appState ?? {}, null),
      };
      if (parsed.libraryItems) {
        result.libraryItems = restoreLibraryItems(parsed.libraryItems, "unpublished");
      }
      return result;
    }
  } catch (error) {
    console.warn("[drawmesh] the dropped file is not a valid scene", error);
  }
  return null;
}

/** Merges a stored scene into the live canvas. */
export function replaceScene(
  api: ExcalidrawImperativeAPI | null,
  elements: OrderedExcalidrawElement[],
  appState: Record<string, unknown>,
): void {
  if (!api) {
    return;
  }
  const restored = restore({ elements, appState, files: {} }, null, null);
  api.updateScene({
    elements: restored.elements,
    appState: restored.appState,
    collaborators: new Map(),
    captureUpdate: "IMMEDIATELY",
  });
}
