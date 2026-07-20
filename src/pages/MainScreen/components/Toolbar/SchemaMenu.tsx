import { useEffect } from "react";
import { LuCheck } from "react-icons/lu";
import { tv } from "tailwind-variants";
import type { SchemaSummary } from "../../../../domain/schema";
import { useActiveDialog } from "../../ActiveDialogContext";

const menuBox = tv({
  base: "absolute top-full left-0 z-50 mt-1 w-56 rounded-md border border-edge bg-surface py-1 shadow-card",
});

const menuItem = tv({
  base: "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[14px] text-heading transition-colors hover:bg-accent-bg",
});

type SchemaMenuProps = {
  savedSchemas: SchemaSummary[];
  currentSchemaId: string | null;
  onSelectSchema: (id: string) => void;
  onClose: () => void;
};

export function SchemaMenu({
  savedSchemas,
  currentSchemaId,
  onSelectSchema,
  onClose,
}: SchemaMenuProps) {
  const { openDialog } = useActiveDialog();

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
      {savedSchemas.map((schema) => {
        const isCurrent = schema.id === currentSchemaId;
        return (
          <button
            key={schema.id}
            type="button"
            role="menuitem"
            aria-current={isCurrent || undefined}
            onClick={() => {
              onClose();
              onSelectSchema(schema.id);
            }}
            className={menuItem()}
          >
            {isCurrent ? (
              <LuCheck aria-hidden="true" className="size-4 shrink-0 text-accent" />
            ) : (
              <span aria-hidden="true" className="size-4 shrink-0" />
            )}
            {schema.name}
          </button>
        );
      })}
      {savedSchemas.length > 0 && <hr className="my-1 border-edge" />}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          openDialog("createSchema");
        }}
        className={menuItem()}
      >
        <span aria-hidden="true" className="size-4 shrink-0" />+ New Schema
      </button>
    </div>
  );
}
