import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved";

/** Tracks whether the scene has unsaved changes. */
export const useSaveStatus = () => {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaving = useCallback(() => {
    setStatus("saving");
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setStatus("saved"), 900);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  return { status, markSaving };
};
