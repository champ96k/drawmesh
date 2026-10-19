import { useEffect } from "react";

/**
 * Removes every Excalidraw link from the running app.
 *
 * `@excalidraw/excalidraw` renders links to the Excalidraw docs, blog, issue
 * tracker and YouTube channel (the help dialog's link header) and to the
 * public shape libraries. None of those exist for DrawMesh, and the
 * components that own them are not exported, so the links are stripped from
 * the DOM instead.
 *
 * The help dialog's header is emptied rather than removed: React only
 * detaches the outermost host node when it unmounts, so emptying the
 * header keeps the unmount safe.
 */
const strip = (root: ParentNode) => {
  const headers = root.querySelectorAll?.(".HelpDialog__header");
  headers?.forEach((header) => {
    header.replaceChildren();
  });

  const links = root.querySelectorAll?.('a[href*="excalidraw"]');
  links?.forEach((link) => {
    link.removeAttribute("href");
    link.removeAttribute("target");
    link.removeAttribute("rel");
    link.classList.add("drawmesh-unlinked");
  });
};

export const RemoveExcalidrawLinks = () => {
  useEffect(() => {
    strip(document);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement) {
            strip(node);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
};
