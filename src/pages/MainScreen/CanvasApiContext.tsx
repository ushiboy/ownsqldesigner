import { type ReactNode, createContext, useContext, useRef, type RefObject } from "react";

export type CanvasApi = {
  /** Deselects every table node via React Flow's own native selection API. */
  deselectAllTables: () => void;
};

const CanvasApiContext = createContext<RefObject<CanvasApi | null> | null>(null);

type CanvasApiProviderProps = {
  children: ReactNode;
};

export function CanvasApiProvider({ children }: CanvasApiProviderProps) {
  const ref = useRef<CanvasApi | null>(null);
  return <CanvasApiContext value={ref}>{children}</CanvasApiContext>;
}

// Unlike this page's other contexts, there is no seedable "initial" value:
// nothing outside Canvas can meaningfully deselect table nodes before
// Canvas exists to own that state, so `ref.current` stays null (callers
// guard with `?.`) until Canvas mounts and registers its API — see
// docs/design/0016-undo-redo.md.
export function useCanvasApiRef(): RefObject<CanvasApi | null> {
  const ref = useContext(CanvasApiContext);
  if (ref === null) {
    throw new Error("useCanvasApiRef must be used within a CanvasApiProvider");
  }
  return ref;
}
