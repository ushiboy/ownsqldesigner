import { LuCheck } from "react-icons/lu";
import { useTranslations } from "use-intl";
import { useEscapeKey } from "../../../../components/hooks/useEscapeKey";
import { useMenuRovingFocus } from "../../../../components/hooks/useMenuRovingFocus";
import type { SchemaSummary } from "../../../../domain/schema";
import { useActiveDialog } from "../../ActiveDialogContext";
import { menuBox, menuItem } from "./dropdownMenu";

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
  const t = useTranslations("schemaMenu");

  useEscapeKey(onClose);
  const { getItemTabIndex, registerItemRef, onMenuKeyDown } = useMenuRovingFocus({
    itemCount: savedSchemas.length + 1,
    initialIndex: Math.max(
      0,
      savedSchemas.findIndex((schema) => schema.id === currentSchemaId),
    ),
    onClose,
  });

  return (
    <div
      role="menu"
      aria-label={t("ariaLabel")}
      tabIndex={-1}
      onKeyDown={onMenuKeyDown}
      className={menuBox()}
    >
      {savedSchemas.map((schema, index) => {
        const isCurrent = schema.id === currentSchemaId;
        return (
          <button
            key={schema.id}
            type="button"
            role="menuitem"
            aria-current={isCurrent || undefined}
            ref={registerItemRef(index)}
            tabIndex={getItemTabIndex(index)}
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
        ref={registerItemRef(savedSchemas.length)}
        tabIndex={getItemTabIndex(savedSchemas.length)}
        onClick={() => {
          onClose();
          openDialog("createSchema");
        }}
        className={menuItem()}
      >
        <span aria-hidden="true" className="size-4 shrink-0" />
        {t("newSchema")}
      </button>
    </div>
  );
}
