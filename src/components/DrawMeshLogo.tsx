type LogoProps = {
  size?: "xs" | "small" | "normal" | "large";
  withText?: boolean;
  className?: string;
};

/**
 * The DrawMesh mark: a triangulated mesh of nodes and edges. Drawn with
 * `currentColor` so it inherits the surrounding text colour exactly like the
 * Excalidraw logo does.
 */
const LogoIcon = () => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="DrawMeshLogo-icon"
    aria-hidden="true"
  >
    <path
      d="M6 30.5 15.5 9.5 31 13.5 24.5 31 6 30.5Z"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <path
      d="M15.5 9.5 24.5 31M31 13.5 24.5 31M6 30.5 31 13.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity="0.75"
    />
    <circle cx="6" cy="30.5" r="3.4" fill="currentColor" />
    <circle cx="15.5" cy="9.5" r="3.4" fill="currentColor" />
    <circle cx="31" cy="13.5" r="3.4" fill="currentColor" />
    <circle cx="24.5" cy="31" r="3.4" fill="currentColor" />
  </svg>
);

const LogoText = () => (
  <span className="DrawMeshLogo-text" aria-hidden="true">
    DrawMesh
  </span>
);

export const DrawMeshLogo = ({ size = "small", withText, className }: LogoProps) => (
  <div
    className={`DrawMeshLogo is-${size}${className ? ` ${className}` : ""}`}
    role={withText ? "img" : undefined}
    aria-label={withText ? "DrawMesh" : undefined}
  >
    <LogoIcon />
    {withText && <LogoText />}
  </div>
);
