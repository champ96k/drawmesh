import { createContext, useContext, useMemo } from "react";
import type {
  ExcalidrawImperativeAPI,
  NormalizedZoomValue,
} from "@excalidraw/excalidraw/types";
import type { ThemePreference } from "@/hooks/useDrawMeshPreferences";

export type CommandCategory = "App" | "File" | "Tools" | "Edit" | "View" | "Help";

export type Command = {
  id: string;
  category: CommandCategory;
  label: string;
  /** Extra words that should match this command when searching. */
  keywords?: string;
  shortcut?: string;
  run: () => void;
};

export type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  api: ExcalidrawImperativeAPI | null;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  language: string;
  setLanguage: (language: string) => void;
  gridEnabled: boolean;
  setGridEnabled: (enabled: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  zenModeEnabled: boolean;
  setZenModeEnabled: (enabled: boolean) => void;
};

export const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

export const useCommandPalette = () => {
  const value = useContext(CommandPaletteContext);
  if (!value) {
    throw new Error("useCommandPalette must be used inside a CommandPaletteContext");
  }
  return value;
};

/** Clicks a control rendered by the canvas chrome, e.g. the undo button. */
const clickControl = (testId: string) => {
  document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)?.click();
};

/**
 * Opens the canvas main menu and activates the entry whose label matches.
 * Used for the commands the package only exposes through its own UI.
 */
const runMenuCommand = (pattern: RegExp) => {
  const trigger = document.querySelector<HTMLElement>(
    '[data-testid="main-menu-trigger"]',
  );
  if (!trigger) {
    return;
  }
  trigger.click();

  window.setTimeout(() => {
    const item = Array.from(
      document.querySelectorAll<HTMLElement>(".dropdown-menu-item"),
    ).find((element) => pattern.test(element.textContent || ""));
    item?.click();
  }, 60);
};

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 30;

export const useCommands = (): Command[] => {
  const {
    api,
    setOpen,
    setTheme,
    language,
    gridEnabled,
    setGridEnabled,
    snapEnabled,
    setSnapEnabled,
    zenModeEnabled,
    setZenModeEnabled,
  } = useCommandPalette();

  return useMemo<Command[]>(() => {
    const zoomBy = (factor: number) => {
      if (!api) {
        return;
      }
      const current = api.getAppState().zoom.value;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * factor));
      api.updateScene({
        appState: { ...api.getAppState(), zoom: { value: next as NormalizedZoomValue } },
        captureUpdate: "IMMEDIATELY",
      });
    };

    const setZoom = (value: number) => {
      if (!api) {
        return;
      }
      api.updateScene({
        appState: { ...api.getAppState(), zoom: { value: value as NormalizedZoomValue } },
        captureUpdate: "IMMEDIATELY",
      });
    };

    const selectTool = (type: string, label: string, shortcut?: string) => ({
      id: `tool.${type}`,
      category: "Tools" as const,
      label: `Switch to ${label} tool`,
      keywords: `${type} ${label}`,
      shortcut,
      run: () => {
        api?.setActiveTool({ type: type as never });
        setOpen(false);
      },
    });

    return [
      // ---------------------------------------------------------------- file
      {
        id: "file.open",
        category: "File",
        label: "Open…",
        shortcut: "Cmd+O",
        keywords: "load import file",
        run: () => {
          setOpen(false);
          runMenuCommand(/^Open/);
        },
      },
      {
        id: "file.save",
        category: "File",
        label: "Save to…",
        keywords: "export json download",
        run: () => {
          setOpen(false);
          runMenuCommand(/^Save to/);
        },
      },
      {
        id: "file.export",
        category: "File",
        label: "Export image…",
        shortcut: "Cmd+Shift+E",
        keywords: "png svg pdf download",
        run: () => {
          setOpen(false);
          runMenuCommand(/^Export image/);
        },
      },

      // ----------------------------------------------------------------- app
      {
        id: "app.theme.light",
        category: "App",
        label: "Use light theme",
        keywords: "theme appearance colour color",
        run: () => {
          setTheme("light");
          setOpen(false);
        },
      },
      {
        id: "app.theme.dark",
        category: "App",
        label: "Use dark theme",
        keywords: "theme appearance colour color",
        run: () => {
          setTheme("dark");
          setOpen(false);
        },
      },
      {
        id: "app.theme.system",
        category: "App",
        label: "Use system theme",
        keywords: "theme appearance auto",
        run: () => {
          setTheme("system");
          setOpen(false);
        },
      },
      {
        id: "app.grid",
        category: "App",
        label: gridEnabled ? "Hide grid" : "Show grid",
        keywords: "snap lines",
        run: () => {
          setGridEnabled(!gridEnabled);
          setOpen(false);
        },
      },
      {
        id: "app.snap",
        category: "App",
        label: snapEnabled ? "Disable object snapping" : "Enable object snapping",
        keywords: "snap align",
        run: () => {
          setSnapEnabled(!snapEnabled);
          setOpen(false);
        },
      },
      {
        id: "app.zen",
        category: "App",
        label: zenModeEnabled ? "Leave zen mode" : "Enter zen mode",
        keywords: "fullscreen focus",
        run: () => {
          setZenModeEnabled(!zenModeEnabled);
          setOpen(false);
        },
      },
      {
        id: "app.reset",
        category: "App",
        label: "Reset the canvas",
        keywords: "clear delete empty",
        run: () => {
          setOpen(false);
          runMenuCommand(/^Reset the canvas/);
        },
      },
      {
        id: "app.language",
        category: "App",
        label: "Change language",
        keywords: `locale i18n ${language}`,
        run: () => {
          setOpen(false);
          runMenuCommand(/^English|^Deutsch/);
        },
      },

      // ---------------------------------------------------------------- edit
      {
        id: "edit.undo",
        category: "Edit",
        label: "Undo",
        shortcut: "Cmd+Z",
        run: () => {
          setOpen(false);
          clickControl("button-undo");
        },
      },
      {
        id: "edit.redo",
        category: "Edit",
        label: "Redo",
        shortcut: "Cmd+Shift+Z",
        run: () => {
          setOpen(false);
          clickControl("button-redo");
        },
      },
      {
        id: "edit.selectAll",
        category: "Edit",
        label: "Select all",
        shortcut: "Cmd+A",
        run: () => {
          setOpen(false);
          window.setTimeout(() => {
            document
              .querySelector<HTMLElement>('[data-testid="toolbar-selection"]')
              ?.click();
          }, 0);
        },
      },

      // ---------------------------------------------------------------- view
      {
        id: "view.zoomIn",
        category: "View",
        label: "Zoom in",
        shortcut: "Cmd++",
        run: () => {
          zoomBy(1 + ZOOM_STEP);
          setOpen(false);
        },
      },
      {
        id: "view.zoomOut",
        category: "View",
        label: "Zoom out",
        shortcut: "Cmd+-",
        run: () => {
          zoomBy(1 - ZOOM_STEP);
          setOpen(false);
        },
      },
      {
        id: "view.zoomReset",
        category: "View",
        label: "Reset zoom to 100%",
        run: () => {
          setZoom(1);
          setOpen(false);
        },
      },
      {
        id: "view.find",
        category: "View",
        label: "Find on canvas",
        shortcut: "Cmd+F",
        keywords: "search text",
        run: () => {
          setOpen(false);
          runMenuCommand(/^Find on canvas/);
        },
      },

      // ---------------------------------------------------------------- help
      {
        id: "help.shortcuts",
        category: "Help",
        label: "Keyboard shortcuts",
        shortcut: "?",
        keywords: "help documentation",
        run: () => {
          setOpen(false);
          runMenuCommand(/^Help/);
        },
      },

      // --------------------------------------------------------------- tools
      selectTool("selection", "selection", "V"),
      selectTool("hand", "hand", "H"),
      selectTool("rectangle", "rectangle", "R"),
      selectTool("diamond", "diamond", "D"),
      selectTool("ellipse", "ellipse", "O"),
      selectTool("arrow", "arrow", "A"),
      selectTool("line", "line", "L"),
      selectTool("freedraw", "draw", "P"),
      selectTool("text", "text", "T"),
      selectTool("eraser", "eraser", "E"),
    ];
  }, [
    api,
    gridEnabled,
    language,
    setGridEnabled,
    setOpen,
    setSnapEnabled,
    setTheme,
    setZenModeEnabled,
    snapEnabled,
    zenModeEnabled,
  ]);
};
