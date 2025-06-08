import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LoadingSpinner from "../LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders with default props", () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByLabelText("Loading");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("animate-spin", "rounded-full", "border-blue-500");

    const srText = screen.getByText("Loading...");
    expect(srText).toBeInTheDocument();
    expect(srText).toHaveClass("sr-only");
  });

  it("renders with small size", () => {
    render(<LoadingSpinner size="sm" />);

    const spinner = screen.getByLabelText("Loading");
    expect(spinner).toHaveClass("w-4", "h-4", "border-2");
  });

  it("renders with medium size (default)", () => {
    render(<LoadingSpinner size="md" />);

    const spinner = screen.getByLabelText("Loading");
    expect(spinner).toHaveClass("w-6", "h-6", "border-2");
  });

  it("renders with large size", () => {
    render(<LoadingSpinner size="lg" />);

    const spinner = screen.getByLabelText("Loading");
    expect(spinner).toHaveClass("w-8", "h-8", "border-3");
  });

  it("applies custom className", () => {
    const customClass = "custom-spinner-class";
    render(<LoadingSpinner className={customClass} />);

    const spinner = screen.getByLabelText("Loading");
    expect(spinner).toHaveClass(customClass);
  });

  it("has proper accessibility attributes", () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByLabelText("Loading");
    expect(spinner).toHaveAttribute("aria-label", "Loading");

    // Screen reader text should be present but hidden
    const srText = screen.getByText("Loading...");
    expect(srText).toBeInTheDocument();
  });

  it("has proper CSS classes for animation", () => {
    render(<LoadingSpinner />);

    const spinner = screen.getByLabelText("Loading");
    expect(spinner).toHaveClass(
      "animate-spin",
      "rounded-full",
      "border-blue-500",
      "border-t-transparent",
      "border-r-transparent",
    );
  });
});
