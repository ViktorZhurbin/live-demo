// Side-effect import so the lazy fallback's styles are emitted into
// `dist/web/index.css`, which layouts load eagerly — the fallback has to be
// styleable before this module's own chunk arrives. See `lazyFallback.css`.
import "./lazyFallback.css";

export { Button } from "./ui/Button/Button";
export type { LiveDemoStringifiedProps } from "./types";
