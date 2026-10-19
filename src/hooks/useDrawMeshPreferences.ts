import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PREFERENCES,
  getPreferences,
  setPreferences,
  type Preferences,
} from "@/lib/storage";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const readSystemTheme = (): ResolvedTheme =>
  typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches
    ? "dark"
    : "light";

/**
 * Owns the user's preferences (theme, language, canvas background) and
 * persists them to IndexedDB.
 */
export const useDrawMeshPreferences = () => {
  const [preferences, setPreferenceState] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(readSystemTheme);

  useEffect(() => {
    let cancelled = false;
    void getPreferences().then((stored) => {
      if (cancelled) {
        return;
      }
      if (stored) {
        setPreferenceState((prev) => ({ ...prev, ...stored }));
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPreferenceState((prev) => {
      const next = { ...prev, ...patch };
      void setPreferences(next);
      return next;
    });
  }, []);

  const theme: ResolvedTheme = useMemo(
    () =>
      preferences.theme === "system" ? systemTheme : (preferences.theme as ResolvedTheme),
    [preferences.theme, systemTheme],
  );

  return {
    preferences,
    loaded,
    theme,
    systemTheme,
    setTheme: (themePreference: ThemePreference) => update({ theme: themePreference }),
    setLanguage: (language: string) => update({ language }),
    setCanvasBackground: (canvasBackground: string) => update({ canvasBackground }),
  };
};
