import { useTranslations } from "use-intl";
import { useEscapeKey } from "../../../../components/hooks/useEscapeKey";
import { useMenuRovingFocus } from "../../../../components/hooks/useMenuRovingFocus";
import { useActiveDialog } from "../../ActiveDialogContext";
import { menuBox, menuItem } from "./dropdownMenu";

type ExportImportMenuProps = {
  canDownloadSchema: boolean;
  onDownloadSchema: () => void;
  onOpenLoadSchema: () => void;
  onClose: () => void;
};

export function ExportImportMenu({
  canDownloadSchema,
  onDownloadSchema,
  onOpenLoadSchema,
  onClose,
}: ExportImportMenuProps) {
  const { openDialog } = useActiveDialog();
  const t = useTranslations("toolbar");
  const tMenu = useTranslations("exportImportMenu");
  const tLoadSchema = useTranslations("loadSchema");

  useEscapeKey(onClose);
  const { getItemTabIndex, registerItemRef, onMenuKeyDown } = useMenuRovingFocus({
    itemCount: 4,
    initialIndex: 0,
    onClose,
  });

  return (
    <div
      role="menu"
      aria-label={tMenu("ariaLabel")}
      tabIndex={-1}
      onKeyDown={onMenuKeyDown}
      className={menuBox()}
    >
      <button
        type="button"
        role="menuitem"
        ref={registerItemRef(0)}
        tabIndex={getItemTabIndex(0)}
        onClick={() => {
          onClose();
          openDialog("exportSql");
        }}
        className={menuItem()}
      >
        {t("exportSql")}
      </button>
      <button
        type="button"
        role="menuitem"
        ref={registerItemRef(1)}
        tabIndex={getItemTabIndex(1)}
        onClick={() => {
          onClose();
          openDialog("exportMermaid");
        }}
        className={menuItem()}
      >
        {t("exportMermaid")}
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!canDownloadSchema}
        ref={registerItemRef(2)}
        tabIndex={getItemTabIndex(2)}
        onClick={() => {
          onClose();
          onDownloadSchema();
        }}
        className={menuItem()}
      >
        {t("downloadJson")}
      </button>
      <button
        type="button"
        role="menuitem"
        ref={registerItemRef(3)}
        tabIndex={getItemTabIndex(3)}
        onClick={() => {
          onClose();
          onOpenLoadSchema();
        }}
        className={menuItem()}
      >
        {tLoadSchema("buttonLabel")}
      </button>
    </div>
  );
}
