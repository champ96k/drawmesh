import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCommands } from "@/features/commands";

type CommandPaletteProps = {
  onClose: () => void;
};

/**
 * DrawMesh's command palette.
 *
 * `@excalidraw/excalidraw` ships a `CommandPalette` component but never
 * renders it, so DrawMesh provides its own using the package's dialog
 * markup and styles.
 */
export const CommandPalette = ({ onClose }: CommandPaletteProps) => {
  const commands = useCommands();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return commands;
    }
    return commands.filter((command) =>
      `${command.label} ${command.category} ${command.keywords ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [commands, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, results.length]);

  const run = (index: number) => {
    const command = results[index];
    if (!command) {
      return;
    }
    onClose();
    // Let the dialog unmount before the command mutates the canvas.
    window.setTimeout(command.run, 0);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.nativeEvent.stopImmediatePropagation();
      event.stopPropagation();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.max(results.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) =>
          (index - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(activeIndex);
    }
  };

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof results>();
    for (const command of results) {
      const list = groups.get(command.category) ?? [];
      list.push(command);
      groups.set(command.category, list);
    }
    return Array.from(groups.entries());
  }, [results]);

  let flatIndex = -1;

  const content = (
    <div
      className="Modal"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      data-prevent-outside-click
      onKeyDown={onKeyDown}
    >
      <div className="Modal__background" onClick={onClose} />
      <div
        className="Modal__content"
        style={{ "--max-width": "720px" } as never}
        tabIndex={0}
      >
        <div className="drawmesh-command-palette">
          <input
            ref={inputRef}
            className="drawmesh-command-palette__input"
            type="text"
            value={query}
            placeholder="Search commands…"
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="drawmesh-command-palette__results" ref={listRef}>
            {grouped.length === 0 && (
              <div className="drawmesh-command-palette__empty">No matching command</div>
            )}
            {grouped.map(([category, list]) => (
              <div key={category} className="drawmesh-command-palette__group">
                <div className="drawmesh-command-palette__category">{category}</div>
                {list.map((command) => {
                  flatIndex += 1;
                  const index = flatIndex;
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={command.id}
                      type="button"
                      className="drawmesh-command-palette__item"
                      data-active={isActive}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => run(index)}
                    >
                      <span className="drawmesh-command-palette__label">
                        {command.label}
                      </span>
                      {command.shortcut && (
                        <span className="drawmesh-command-palette__shortcut">
                          {command.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const host = document.getElementById("root");
  return host ? createPortal(content, host) : content;
};
