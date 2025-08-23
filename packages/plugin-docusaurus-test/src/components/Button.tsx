import type React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export default function Button({
  children,
  onClick,
  variant = "primary",
}: ButtonProps) {
  const baseStyles = {
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  };

  const primaryStyles = {
    ...baseStyles,
    background: "linear-gradient(45deg, #ff6b6b, #4ecdc4)",
    color: "white",
    boxShadow: "0 4px 15px rgba(255, 107, 107, 0.3)",
  };

  const secondaryStyles = {
    ...baseStyles,
    background: "linear-gradient(45deg, #a8edea, #fed6e3)",
    color: "#333",
    boxShadow: "0 4px 15px rgba(168, 237, 234, 0.3)",
  };

  return (
    // biome-ignore lint/a11y/useKeyWithMouseEvents: my explanation
    <button
      type="button"
      onClick={onClick}
      style={variant === "primary" ? primaryStyles : secondaryStyles}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          variant === "primary"
            ? "0 6px 20px rgba(255, 107, 107, 0.4)"
            : "0 6px 20px rgba(168, 237, 234, 0.4)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          variant === "primary"
            ? "0 4px 15px rgba(255, 107, 107, 0.3)"
            : "0 4px 15px rgba(168, 237, 234, 0.3)";
      }}
    >
      {children}
    </button>
  );
}
