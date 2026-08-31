import {
  LuChevronDown,
  LuGrid3X3,
  LuLanguages,
  LuMonitor,
  LuMoon,
  LuNetwork,
  LuPanelRight,
  LuPencil,
  LuPlus,
  LuRedo2,
  LuSettings,
  LuSun,
  LuTrash2,
  LuType,
  LuUndo2,
} from "react-icons/lu";
import { useRef } from "react";
import { Link } from "react-router";
import { tv } from "tailwind-variants";
import { useLocale, useTranslations } from "use-intl";
import type { SchemaSummary } from "../../../../domain/schema";
import { useLocaleSwitch } from "../../../../i18n/LocaleContext";
import { useActiveDialog } from "../../ActiveDialogContext";
import { useCanvasApiRef } from "../../CanvasApiContext";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import type { Theme } from "../../hooks/useThemePreference";
import { ExportImportMenu } from "./ExportImportMenu";
import { LoadSchemaHandler, type LoadSchemaHandle } from "./LoadSchemaHandler";
import { LocaleMenu } from "./LocaleMenu";
import { SchemaMenu } from "./SchemaMenu";
import { useToolbarMenu } from "./useToolbarMenu";

const THEME_ICON: Record<Theme, typeof LuSun> = {
  light: LuSun,
  dark: LuMoon,
  system: LuMonitor,
};

const toolbar = tv({
  base: "flex shrink-0 items-center gap-1 border-b border-edge bg-surface px-3 py-2",
});

const toolButton = tv({
  base: "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[14px] text-heading transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40",
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
  canDownloadSchema: boolean;
  onDownloadSchema: () => void;
  onSelectSchema: (id: string) => void;
  isSidePanelOpen: boolean;
  onToggleSidePanel: () => void;
  theme: Theme;
  onCycleTheme: () => void;
  showColumnDetails: boolean;
  onToggleColumnDetails: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
};

export function Toolbar({
  schemaName,
  savedSchemas,
  currentSchemaId,
  canDownloadSchema,
  onDownloadSchema,
  onSelectSchema,
  isSidePanelOpen,
  onToggleSidePanel,
  theme,
  onCycleTheme,
  showColumnDetails,
  onToggleColumnDetails,
  snapToGrid,
  onToggleSnapToGrid,
}: ToolbarProps) {
  const {
    isOpen: isMenuOpen,
    wrapperRef: menuWrapperRef,
    triggerRef: menuTriggerRef,
    toggle,
    close,
  } = useToolbarMenu();
  const {
    isOpen: isLocaleMenuOpen,
    wrapperRef: localeMenuWrapperRef,
    triggerRef: localeMenuTriggerRef,
    toggle: toggleLocaleMenu,
    close: closeLocaleMenu,
  } = useToolbarMenu();
  const {
    isOpen: isExportImportMenuOpen,
    wrapperRef: exportImportMenuWrapperRef,
    triggerRef: exportImportMenuTriggerRef,
    toggle: toggleExportImportMenu,
    close: closeExportImportMenu,
  } = useToolbarMenu();
  const { openDialog } = useActiveDialog();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const canvasApiRef = useCanvasApiRef();
  const loadSchemaHandleRef = useRef<LoadSchemaHandle>(null);
  const locale = useLocale();
  const t = useTranslations("toolbar");
  const { setLocale } = useLocaleSwitch();
  const ThemeIcon = THEME_ICON[theme];

  return (
    <header className={toolbar()}>
      <div ref={menuWrapperRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          ref={menuTriggerRef}
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
        aria-label={t("renameSchemaAriaLabel")}
        onClick={() => openDialog("renameSchema")}
        className={toolButton()}
      >
        <LuPencil aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        aria-label={t("deleteSchemaAriaLabel")}
        onClick={() => openDialog("deleteSchema")}
        className={toolButton()}
      >
        <LuTrash2 aria-hidden="true" className="size-4" />
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label={t("undo")}
          disabled={!canUndo}
          onClick={undo}
          className={toolButton()}
        >
          <LuUndo2 aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={t("redo")}
          disabled={!canRedo}
          onClick={redo}
          className={toolButton()}
        >
          <LuRedo2 aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={t("autoAlignAriaLabel")}
          onClick={() => canvasApiRef.current?.autoAlignTables()}
          className={toolButton()}
        >
          <LuNetwork aria-hidden="true" className="size-4" />
        </button>
        <button type="button" onClick={() => openDialog("createTable")} className={toolButton()}>
          <LuPlus aria-hidden="true" className="size-4" />
          {t("addTable")}
        </button>
        <div ref={exportImportMenuWrapperRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isExportImportMenuOpen}
            ref={exportImportMenuTriggerRef}
            onClick={toggleExportImportMenu}
            className={toolButton()}
          >
            {t("exportImportMenuLabel")} <LuChevronDown aria-hidden="true" className="size-4" />
          </button>
          {isExportImportMenuOpen && (
            <ExportImportMenu
              canDownloadSchema={canDownloadSchema}
              onDownloadSchema={onDownloadSchema}
              onOpenLoadSchema={() => loadSchemaHandleRef.current?.openFilePicker()}
              onClose={closeExportImportMenu}
            />
          )}
        </div>
        {/* Stays mounted outside the menu's conditional — unmounting before the OS
            file picker resolves silently drops the selection (invisible to jsdom tests). */}
        <LoadSchemaHandler ref={loadSchemaHandleRef} />
        <button
          type="button"
          aria-label={t("themeAriaLabel", { theme })}
          onClick={onCycleTheme}
          className={toolButton()}
        >
          <ThemeIcon aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={t("toggleColumnDetailsAriaLabel")}
          aria-pressed={showColumnDetails}
          onClick={onToggleColumnDetails}
          className={toolButton({ pressed: showColumnDetails })}
        >
          <LuType aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={t("toggleSnapToGridAriaLabel")}
          aria-pressed={snapToGrid}
          onClick={onToggleSnapToGrid}
          className={toolButton({ pressed: snapToGrid })}
        >
          <LuGrid3X3 aria-hidden="true" className="size-4" />
        </button>
        <div ref={localeMenuWrapperRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isLocaleMenuOpen}
            aria-label={t("localeAriaLabel", { locale })}
            ref={localeMenuTriggerRef}
            onClick={toggleLocaleMenu}
            className={toolButton()}
          >
            <LuLanguages aria-hidden="true" className="size-4" />
          </button>
          {isLocaleMenuOpen && (
            <LocaleMenu
              currentLocale={locale}
              onSelectLocale={setLocale}
              onClose={closeLocaleMenu}
            />
          )}
        </div>
        <Link to="/settings" aria-label={t("settingsAriaLabel")} className={toolButton()}>
          <LuSettings aria-hidden="true" className="size-4" />
        </Link>
        <button
          type="button"
          aria-label={t("toggleSidePanelAriaLabel")}
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
