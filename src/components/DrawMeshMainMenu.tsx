import { useCallback } from "react";
import { MainMenu, languages } from "@excalidraw/excalidraw";
import type { ThemePreference } from "@/hooks/useDrawMeshPreferences";

/** The lightning-bolt glyph the package uses for the command palette. */
const CommandPaletteIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    role="img"
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="2"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <g strokeWidth="1.25">
      <path d="M0 0h24v24H0z" fill="none" stroke="none" />
      <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />
    </g>
  </svg>
);

type DrawMeshMainMenuProps = {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  onOpenCommandPalette: () => void;
};

/**
 * DrawMesh's main menu.
 *
 * It is rendered as a child of `<Excalidraw>`, which makes the package's
 * `MainMenuTunnel` route this menu into the canvas chrome in place of the
 * package's own default menu. Everything that would point at an account
 * (Excalidraw+, GitHub, Discord, sign up) is intentionally absent.
 */
export const DrawMeshMainMenu = ({
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  onOpenCommandPalette,
}: DrawMeshMainMenuProps) => {
  const onSelectLanguage = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onLanguageChange(event.target.value);
    },
    [onLanguageChange],
  );

  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      <MainMenu.Item
        icon={<CommandPaletteIcon />}
        shortcut="Cmd+/"
        onSelect={onOpenCommandPalette}
        data-testid="command-palette-button"
        aria-label="Command palette"
      >
        Command palette
      </MainMenu.Item>
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme
        allowSystemTheme
        theme={theme}
        onSelect={onThemeChange}
      />
      <MainMenu.ItemCustom>
        <select
          className="dropdown-select dropdown-select__language"
          aria-label="Select language"
          style={{ width: "100%" }}
          value={language}
          onChange={onSelectLanguage}
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </MainMenu.ItemCustom>
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
};
