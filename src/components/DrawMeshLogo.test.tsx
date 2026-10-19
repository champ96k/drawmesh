import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DrawMeshLogo } from "@/components/DrawMeshLogo";

describe("DrawMeshLogo", () => {
  it("renders the wordmark when asked", () => {
    render(<DrawMeshLogo withText />);
    expect(screen.getByRole("img", { name: "DrawMesh" })).toBeInTheDocument();
  });

  it("omits the wordmark otherwise", () => {
    const { container } = render(<DrawMeshLogo />);
    expect(container.textContent).toBe("");
  });
});
