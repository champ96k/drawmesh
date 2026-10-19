import { WelcomeScreen } from "@excalidraw/excalidraw";
import { DrawMeshLogo } from "./DrawMeshLogo";

/**
 * DrawMesh's welcome screen.
 *
 * Like the main menu, this is rendered as a child of `<Excalidraw>` so the
 * package's `WelcomeScreenCenterTunnel` shows it instead of the built-in
 * one. The hand-drawn hints are reused verbatim; only the logo, the copy
 * and the menu items differ.
 */
export const DrawMeshWelcomeScreen = () => (
  <WelcomeScreen>
    <WelcomeScreen.Center>
      <WelcomeScreen.Center.Logo>
        <DrawMeshLogo withText size="normal" />
      </WelcomeScreen.Center.Logo>
      <WelcomeScreen.Center.Heading>
        Your drawings are saved on this device.
        <br />
        Nothing is uploaded, and no account is needed.
        <br />
        Save your work to a file regularly to avoid losing it.
      </WelcomeScreen.Center.Heading>
      <WelcomeScreen.Center.Menu>
        <WelcomeScreen.Center.MenuItemLoadScene />
        <WelcomeScreen.Center.MenuItemHelp />
      </WelcomeScreen.Center.Menu>
    </WelcomeScreen.Center>
    <WelcomeScreen.Hints.MenuHint>
      Export, preferences, languages, ...
    </WelcomeScreen.Hints.MenuHint>
    <WelcomeScreen.Hints.ToolbarHint />
    <WelcomeScreen.Hints.HelpHint />
  </WelcomeScreen>
);
