import { DrawMeshLogo } from "./DrawMeshLogo";

export type SaveStatus = "idle" | "saving" | "saved";

type DrawMeshTopRightUIProps = {
  status: SaveStatus;
};

/**
 * The top-right corner of the canvas. Excalidraw's "Try Excalidraw+" banner
 * and "Share" button are not rendered by the package at all, so this slot is
 * used for a small local-only indicator that tells the user where their
 * drawing lives.
 */
export const DrawMeshTopRightUI = ({ status }: DrawMeshTopRightUIProps) => (
  <div className="drawmesh-top-right">
    <div className="drawmesh-top-right__brand" title="DrawMesh">
      <DrawMeshLogo size="xs" />
    </div>
    <div
      className="drawmesh-top-right__status"
      data-status={status}
      role="status"
      aria-live="polite"
    >
      {status === "saving" ? "Saving…" : "Saved on this device"}
    </div>
  </div>
);
