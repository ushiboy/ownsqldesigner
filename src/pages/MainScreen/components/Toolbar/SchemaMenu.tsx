import { useEffect } from "react";
import { tv } from "tailwind-variants";
import type { SchemaSummary } from "../../../../domain/schema";

const menuBox = tv({
  base: "absolute top-full left-0 z-50 mt-1 w-56 rounded-md border border-edge bg-surface py-1 shadow-card",
});

const menuItem = tv({
  base: "block w-full px-3 py-1.5 text-left text-[14px] text-heading transition-colors hover:bg-accent-bg disabled:text-body disabled:hover:bg-transparent",
});

type SchemaMenuProps = {
  savedSchemas: SchemaSummary[];
  onRequestCreateSchema: () => void;
  onClose: () => void;
};

export function SchemaMenu({ savedSchemas, onRequestCreateSchema, onClose }: SchemaMenuProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div role="menu" aria-label="Schemas" className={menuBox()}>
      {savedSchemas.map((schema) => (
        // Selection (REQ-025) is out of scope; list items stay inert for now.
        <button key={schema.id} type="button" role="menuitem" disabled className={menuItem()}>
          {schema.name}
        </button>
      ))}
      {savedSchemas.length > 0 && <hr className="my-1 border-edge" />}
      <button type="button" role="menuitem" onClick={onRequestCreateSchema} className={menuItem()}>
        + New Schema
      </button>
    </div>
  );
}
