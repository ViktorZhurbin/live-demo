interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ onClick, children }: ButtonProps) {
  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}
