import type React from "react";

interface CodeBlockProps {
  children: React.ReactNode;
}

export default function CodeBlock({ children }: CodeBlockProps) {
  const styles = {
    backgroundColor: "#f8f9fa",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "16px",
    fontFamily: 'Monaco, "Lucida Console", "Courier New", monospace',
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#343a40",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    margin: "16px 0",
  };

  return <div style={styles}>{children}</div>;
}
