import { useEffect } from "react";

/**
 * Visual parity layer for the canvas toolbar's keybinding badges.
 *
 * `@excalidraw/excalidraw@0.18.1` always renders the *numeric* shortcut
 * (`1`, `2`, `3`, …) next to a tool, while excalidraw.com renders the
 * *letter* shortcut (`V`, `R`, `D`, …) with the number only mentioned in the
 * tooltip. The live site is ahead of the published package, so the badge is
 * annotated here with the letter taken from the package's own accessible
 * title (`"Rectangle — R or 2"`).
 *
 * The letter is written to a `data-parity-key` attribute and rendered by CSS
 * (`src/styles/app.css`), so a React re-render — which rewrites the badge
 * text but never touches attributes it does not own — cannot undo it.
 *
 * The whole layer is a no-op if the package changes its markup.
 */
const LETTER_IN_TITLE = /—\s*([A-Z])\s+or\s+\d/;

const applyTo = (badge: HTMLElement) => {
  // Shape tools are rendered as a radio <label title="Rectangle — R or 2">;
  // the remaining ones are plain buttons. Both carry the title.
  const host = badge.closest<HTMLElement>("[title]");
  const title = host?.getAttribute("title") ?? "";
  const match = LETTER_IN_TITLE.exec(title);
  if (!match) {
    return;
  }
  const letter = match[1];
  if (badge.dataset.parityKey !== letter) {
    badge.dataset.parityKey = letter;
  }
};

const applyToTree = (root: ParentNode) => {
  if (root instanceof HTMLElement && root.matches(".ToolIcon__keybinding")) {
    applyTo(root);
  }
  root.querySelectorAll<HTMLElement>(".ToolIcon__keybinding").forEach(applyTo);
};

export const ToolbarKeybindingParity = () => {
  useEffect(() => {
    applyToTree(document);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement) {
            applyToTree(node);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
};
