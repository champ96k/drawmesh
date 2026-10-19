import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  DEFAULT_PREFERENCES,
  STORAGE_KEYS,
  getItem,
  getPreferences,
  setItem,
  setPreferences,
} from "./storage";

const store = new Map<string, unknown>();

vi.mock("localforage", () => ({
  default: {
    createInstance: () => ({
      getItem: async (key: string) => store.get(key) ?? null,
      setItem: async (key: string, value: unknown) => {
        store.set(key, value);
        return value;
      },
      removeItem: async (key: string) => {
        store.delete(key);
      },
    }),
  },
}));

describe("storage", () => {
  beforeEach(() => {
    store.clear();
  });

  it("round-trips a value", async () => {
    await setItem("hello", { a: 1 });
    expect(await getItem<{ a: number }>("hello")).toEqual({ a: 1 });
  });

  it("returns null for a missing key", async () => {
    expect(await getItem("missing")).toBeNull();
  });

  it("stores preferences under the preferences key", async () => {
    await setPreferences({ ...DEFAULT_PREFERENCES, theme: "dark" });
    expect(store.has(STORAGE_KEYS.preferences)).toBe(true);
    expect((await getPreferences())?.theme).toBe("dark");
  });

  it("merges partial stored preferences over the defaults", async () => {
    await setItem(STORAGE_KEYS.preferences, { theme: "dark" });
    expect((await getPreferences())?.theme).toBe("dark");
  });
});
