import localforage from "localforage";

/**
 * A single IndexedDB store holds everything DrawMesh owns. Nothing ever
 * leaves the device: there is no server, no sync and no telemetry.
 */
const store = localforage.createInstance({
  name: "drawmesh",
  storeName: "drawmesh",
  description: "Local-first storage for DrawMesh scenes, library and preferences.",
});

export const STORAGE_KEYS = {
  scene: "scene",
  library: "library",
  preferences: "preferences",
} as const;

export type Preferences = {
  /** "light" | "dark" | "system" */
  theme: "light" | "dark" | "system";
  language: string;
  canvasBackground: string;
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  language: "en",
  canvasBackground: "#ffffff",
};

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    return (await store.getItem<T>(key)) ?? null;
  } catch (error) {
    console.warn(`[drawmesh] failed to read "${key}"`, error);
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await store.setItem(key, value);
  } catch (error) {
    console.warn(`[drawmesh] failed to write "${key}"`, error);
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await store.removeItem(key);
  } catch (error) {
    console.warn(`[drawmesh] failed to remove "${key}"`, error);
  }
}

export const getScene = <T>() => getItem<T>(STORAGE_KEYS.scene);
export const setScene = <T>(scene: T) => setItem(STORAGE_KEYS.scene, scene);
export const getLibrary = <T>() => getItem<T>(STORAGE_KEYS.library);
export const setLibrary = <T>(library: T) => setItem(STORAGE_KEYS.library, library);
export const getPreferences = () =>
  getItem<Partial<Preferences>>(STORAGE_KEYS.preferences);
export const setPreferences = (prefs: Preferences) =>
  setItem(STORAGE_KEYS.preferences, prefs);
