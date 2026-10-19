import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { CommandPaletteContext, useCommands } from "./commands";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const buildContext = (
  overrides: Partial<React.ContextType<typeof CommandPaletteContext>> = {},
) => {
  const setOpen = vi.fn();
  const setActiveTool = vi.fn();
  const api = {
    setActiveTool,
    getAppState: () => ({ zoom: { value: 1 } }),
    updateScene: vi.fn(),
    toggleSidebar: vi.fn(),
  } as unknown as ExcalidrawImperativeAPI;

  const value = {
    open: false,
    setOpen,
    api,
    theme: "light" as const,
    setTheme: vi.fn(),
    language: "en",
    setLanguage: vi.fn(),
    gridEnabled: false,
    setGridEnabled: vi.fn(),
    snapEnabled: false,
    setSnapEnabled: vi.fn(),
    zenModeEnabled: false,
    setZenModeEnabled: vi.fn(),
    ...overrides,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );

  return { value, wrapper };
};

describe("useCommands", () => {
  it("exposes the board commands and no account commands", () => {
    const { wrapper } = buildContext();
    const { result } = renderHook(() => useCommands(), { wrapper });

    const labels = result.current.map((command) => command.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Open…",
        "Save to…",
        "Export image…",
        "Use light theme",
        "Use dark theme",
        "Use system theme",
        "Undo",
        "Redo",
        "Zoom in",
        "Zoom out",
        "Reset zoom to 100%",
        "Find on canvas",
        "Keyboard shortcuts",
        "Switch to rectangle tool",
        "Switch to text tool",
      ]),
    );

    const joined = labels.join(" ");
    expect(joined).not.toMatch(/sign up|share|collaborat/i);
  });

  it("switches the active tool through the imperative API", () => {
    const { value, wrapper } = buildContext();
    const { result } = renderHook(() => useCommands(), { wrapper });

    const rectangle = result.current.find((command) => command.id === "tool.rectangle");
    expect(rectangle).toBeDefined();

    rectangle?.run();

    expect(value.api?.setActiveTool).toHaveBeenCalledWith({ type: "rectangle" });
    expect(value.setOpen).toHaveBeenCalledWith(false);
  });

  it("zooms relative to the current zoom level", () => {
    const { value, wrapper } = buildContext();
    const { result } = renderHook(() => useCommands(), { wrapper });

    result.current.find((command) => command.id === "view.zoomIn")?.run();

    expect(value.api?.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({ zoom: { value: 1.1 } }),
      }),
    );
  });
});
