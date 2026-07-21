import { LuChevronDown, LuPanelRight, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { tv } from "tailwind-variants";
import type { SchemaSummary } from "../../../../domain/schema";
import { useActiveDialog } from "../../ActiveDialogContext";
import { SchemaMenu } from "./SchemaMenu";
import { useToolbarMenu } from "./useToolbarMenu";

const toolbar = tv({
  base: "flex shrink-0 items-center gap-1 border-b border-edge bg-surface px-3 py-2",
});

const toolButton = tv({
  base: "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[14px] text-heading transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  variants: {
    pressed: {
      true: "bg-accent-bg text-accent",
    },
  },
});

type ToolbarProps = {
  schemaName: string;
  savedSchemas: SchemaSummary[];
  currentSchemaId: string | null;
  onSelectSchema: (id: string) => void;
  isSidePanelOpen: boolean;
  onToggleSidePanel: () => void;
};

export function Toolbar({
  schemaName,
  savedSchemas,
  currentSchemaId,
  onSelectSchema,
  isSidePanelOpen,
  onToggleSidePanel,
}: ToolbarProps) {
  const { isOpen: isMenuOpen, wrapperRef: menuWrapperRef, toggle, close } = useToolbarMenu();
  const { openDialog } = useActiveDialog();

  return (
    <header className={toolbar()}>
      <div ref={menuWrapperRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={toggle}
          className={toolButton()}
        >
          {schemaName} <LuChevronDown aria-hidden="true" className="size-4" />
        </button>
        {isMenuOpen && (
          <SchemaMenu
            savedSchemas={savedSchemas}
            currentSchemaId={currentSchemaId}
            onSelectSchema={onSelectSchema}
            onClose={close}
          />
        )}
      </div>
      <button
        type="button"
        aria-label="Rename schema"
        onClick={() => openDialog("renameSchema")}
        className={toolButton()}
      >
        <LuPencil aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Delete schema"
        onClick={() => openDialog("deleteSchema")}
        className={toolButton()}
      >
        <LuTrash2 aria-hidden="true" className="size-4" />
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={() => openDialog("createTable")} className={toolButton()}>
          <LuPlus aria-hidden="true" className="size-4" />
          Add Table
        </button>
        <button type="button" className={toolButton()}>
          Export SQL
        </button>
        <button
          type="button"
          aria-label="Toggle side panel"
          aria-pressed={isSidePanelOpen}
          onClick={onToggleSidePanel}
          className={toolButton({ pressed: isSidePanelOpen })}
        >
          <LuPanelRight aria-hidden="true" className="size-4" />
        </button>
      </div>
    </header>
  );
}
