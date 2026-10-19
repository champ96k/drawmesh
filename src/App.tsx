import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Excalidraw as ExcalidrawCanvas } from "@excalidraw/excalidraw";
import type {
  AppState,
  ExcalidrawImperativeAPI,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { CommandPalette } from "@/components/CommandPalette";
import { DrawMeshMainMenu } from "@/components/DrawMeshMainMenu";
import { DrawMeshWelcomeScreen } from "@/components/DrawMeshWelcomeScreen";
import { DrawMeshTopRightUI } from "@/components/DrawMeshTopRightUI";
import { useSaveStatus } from "@/hooks/useSaveStatus";
import { ToolbarKeybindingParity } from "@/components/ToolbarKeybindingParity";
import { useDrawMeshPreferences } from "@/hooks/useDrawMeshPreferences";
import { CommandPaletteContext } from "@/features/commands";
import { loadInitialData, persistLibrary, persistScene } from "@/lib/scene";

const SAVE_DEBOUNCE_MS = 400;

export const App = () => {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { status, markSaving } = useSaveStatus();
  const { preferences, loaded, theme, setTheme, setLanguage } = useDrawMeshPreferences();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [zenModeEnabled, setZenModeEnabled] = useState(false);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", theme === "dark" ? "#121212" : "#5b57d6");
  }, [theme]);

  // Cmd+/ and Cmd+Shift+P open the command palette.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isPaletteShortcut =
        (event.metaKey || event.ctrlKey) &&
        (event.key === "/" || (event.key === "p" && event.shiftKey));
      if (!isPaletteShortcut) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      setPaletteOpen((open) => !open);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const scheduleSave = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      markSaving();
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      saveTimer.current = setTimeout(() => {
        persistScene(elements, appState, files);
      }, SAVE_DEBOUNCE_MS);
    },
    [markSaving],
  );

  useEffect(
    () => () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    },
    [],
  );

  const onChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      scheduleSave(elements, appState, files);
    },
    [scheduleSave],
  );

  const onLibraryChange = useCallback((libraryItems: readonly never[]) => {
    persistLibrary(libraryItems);
  }, []);

  const paletteContext = useMemo(
    () => ({
      open: paletteOpen,
      setOpen: setPaletteOpen,
      api,
      theme: preferences.theme,
      setTheme,
      language: preferences.language,
      setLanguage,
      gridEnabled,
      setGridEnabled,
      snapEnabled,
      setSnapEnabled,
      zenModeEnabled,
      setZenModeEnabled,
    }),
    [
      api,
      gridEnabled,
      paletteOpen,
      preferences.language,
      preferences.theme,
      setLanguage,
      setTheme,
      snapEnabled,
      zenModeEnabled,
    ],
  );

  if (!loaded) {
    return <div className="drawmesh-boot" aria-busy="true" />;
  }

  return (
    <CommandPaletteContext.Provider value={paletteContext}>
      <div className="drawmesh-app">
        <ExcalidrawCanvas
          excalidrawAPI={(instance) => {
            setApi(instance);
            if (import.meta.env.DEV) {
              (window as unknown as { __drawmesh?: unknown }).__drawmesh = instance;
            }
          }}
          initialData={async () => {
            const data = await loadInitialData();
            return data ?? { elements: [], appState: { exportScale: 1 } };
          }}
          onChange={onChange}
          onLibraryChange={onLibraryChange as never}
          theme={theme}
          langCode={preferences.language as never}
          name="DrawMesh"
          autoFocus
          handleKeyboardGlobally
          gridModeEnabled={gridEnabled}
          objectsSnapModeEnabled={snapEnabled}
          zenModeEnabled={zenModeEnabled}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              export: {},
              loadScene: true,
              saveToActiveFile: true,
              saveAsImage: true,
              toggleTheme: true,
            },
            tools: {
              image: true,
            },
          }}
          renderTopRightUI={() => <DrawMeshTopRightUI status={status} />}
        >
          <DrawMeshMainMenu
            theme={preferences.theme}
            onThemeChange={setTheme}
            language={preferences.language}
            onLanguageChange={setLanguage}
            onOpenCommandPalette={() => setPaletteOpen(true)}
          />
          <DrawMeshWelcomeScreen />
          <ToolbarKeybindingParity />
        </ExcalidrawCanvas>
        {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      </div>
    </CommandPaletteContext.Provider>
  );
};
