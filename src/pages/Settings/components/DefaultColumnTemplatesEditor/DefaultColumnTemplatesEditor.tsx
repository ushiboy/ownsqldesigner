import { useMemo, useState } from "react";
import { LuChevronDown, LuChevronUp, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { tv } from "tailwind-variants";
import { useTranslations } from "use-intl";
import { ColumnDialog } from "../../../../components/parts/ColumnDialog";
import {
  DEFAULT_SQL_DIALECT,
  getDialectStrategy,
  SQL_DIALECT_LABELS,
  SQL_DIALECTS,
  type SqlDialect,
} from "../../../../domain/dialect";
import {
  EMPTY_COLUMN_KEY_MEMBERSHIP,
  getDefaultColumnTemplateKeyMembershipDisabled,
  getDefaultColumnTemplatesForDialect,
  type Column,
  type ColumnKeyMembership,
  type DefaultColumnTemplate,
  type DefaultColumnTemplatesSettings,
} from "../../../../domain/schema";

const dialectTabButton = tv({
  base: "rounded-md px-3 py-1.5 text-[13px] text-heading transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  variants: {
    pressed: {
      true: "bg-accent-bg text-accent",
    },
  },
});

const iconButton = tv({
  base: "inline-flex items-center rounded-md p-1 text-body transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40",
});

const addRowButton = tv({
  base: "mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-heading transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

type DefaultColumnTemplatesEditorProps = {
  settings: DefaultColumnTemplatesSettings;
  onChange: (settings: DefaultColumnTemplatesSettings) => void;
};

type DialogState = { mode: "add" } | { mode: "edit"; templateId: string };

export function DefaultColumnTemplatesEditor({
  settings,
  onChange,
}: DefaultColumnTemplatesEditorProps) {
  const t = useTranslations("settings");
  const tSidePanel = useTranslations("sidePanel");
  const tColumn = useTranslations("columnDialog");
  const tCommon = useTranslations("common");
  const [dialect, setDialect] = useState<SqlDialect>(DEFAULT_SQL_DIALECT);
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const strategy = getDialectStrategy(dialect);
  const templates = getDefaultColumnTemplatesForDialect(settings, dialect);
  const editingTemplate =
    dialogState?.mode === "edit"
      ? (templates.find((template) => template.id === dialogState.templateId) ?? null)
      : null;
  const existingNames = useMemo(
    () =>
      templates
        .filter((template) => template.id !== editingTemplate?.id)
        .map((template) => template.name),
    [templates, editingTemplate],
  );
  const keyMembershipDisabled = useMemo(
    () => getDefaultColumnTemplateKeyMembershipDisabled(templates, editingTemplate?.id ?? null),
    [templates, editingTemplate],
  );

  const updateTemplates = (next: DefaultColumnTemplate[]) => {
    onChange({ ...settings, [dialect]: next });
  };

  const handleSubmit = (fields: Omit<Column, "id">, keyMembership: ColumnKeyMembership) => {
    if (editingTemplate !== null) {
      updateTemplates(
        templates.map((template) =>
          template.id === editingTemplate.id
            ? { id: editingTemplate.id, ...fields, keyMembership }
            : template,
        ),
      );
    } else {
      updateTemplates([...templates, { id: crypto.randomUUID(), ...fields, keyMembership }]);
    }
    setDialogState(null);
  };

  return (
    <div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-[14px] text-body">{t("defaultColumnsDialectLegend")}</legend>
        <div role="tablist" className="flex gap-1">
          {SQL_DIALECTS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={option === dialect}
              onClick={() => setDialect(option)}
              className={dialectTabButton({ pressed: option === dialect })}
            >
              {SQL_DIALECT_LABELS[option]}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-3">
        {templates.length === 0 && (
          <p className="text-[13px] text-body">{t("defaultColumnsEmptyHint")}</p>
        )}
        <ul className="flex flex-col gap-1 text-[13px]">
          {templates.map((template, index) => (
            <li key={template.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                <span className="text-heading">{template.name}</span>{" "}
                <span className="text-body">{template.type}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={tSidePanel("moveColumnUpAriaLabel", { name: template.name })}
                  disabled={index === 0}
                  onClick={() => updateTemplates(swap(templates, index, index - 1))}
                  className={iconButton()}
                >
                  <LuChevronUp aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={tSidePanel("moveColumnDownAriaLabel", { name: template.name })}
                  disabled={index === templates.length - 1}
                  onClick={() => updateTemplates(swap(templates, index, index + 1))}
                  className={iconButton()}
                >
                  <LuChevronDown aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={tSidePanel("editColumnAriaLabel", { name: template.name })}
                  onClick={() => setDialogState({ mode: "edit", templateId: template.id })}
                  className={iconButton()}
                >
                  <LuPencil aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={tSidePanel("deleteColumnAriaLabel", { name: template.name })}
                  onClick={() => updateTemplates(templates.filter((_, i) => i !== index))}
                  className={iconButton()}
                >
                  <LuTrash2 aria-hidden="true" className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setDialogState({ mode: "add" })}
        className={addRowButton()}
      >
        <LuPlus aria-hidden="true" className="size-4" />
        {tSidePanel("addColumn")}
      </button>
      <ColumnDialog
        open={dialogState !== null}
        title={editingTemplate !== null ? tColumn("editTitle") : tColumn("addTitle")}
        submitLabel={editingTemplate !== null ? tCommon("save") : tCommon("add")}
        initialColumn={editingTemplate === null ? null : toColumn(editingTemplate)}
        strategy={strategy}
        existingNames={existingNames}
        keyMembership={editingTemplate?.keyMembership ?? EMPTY_COLUMN_KEY_MEMBERSHIP}
        keyMembershipDisabled={keyMembershipDisabled}
        onSubmit={handleSubmit}
        onCancel={() => setDialogState(null)}
      />
    </div>
  );
}

function toColumn(template: DefaultColumnTemplate): Column {
  const { keyMembership: _keyMembership, ...column } = template;
  return column;
}

function swap<T>(list: T[], indexA: number, indexB: number): T[] {
  const next = [...list];
  [next[indexA], next[indexB]] = [next[indexB]!, next[indexA]!];
  return next;
}
