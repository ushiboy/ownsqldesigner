import { useState } from "react";
import { LuChevronDown, LuChevronUp, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { tv } from "tailwind-variants";
import { useTranslations } from "use-intl";
import {
  SQL_DIALECT_LABELS,
  type DialectStrategy,
  type SqlDialect,
} from "../../../../domain/dialect";
import { describeNameValidity, type Table } from "../../../../domain/schema";
import { describeKey } from "./describeKey";

const panel = tv({
  base: "shrink-0 overflow-hidden bg-surface transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
  variants: {
    open: {
      true: "w-80",
      false: "w-0",
    },
  },
});

const fieldInput = tv({
  base: "mt-1 w-full rounded-md border border-edge bg-surface px-2.5 py-1.5 text-[14px] text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

// Small icon-only button, matching Toolbar.tsx's local `toolButton` — no
// shared icon-button component exists yet in this codebase.
const iconButton = tv({
  base: "inline-flex items-center rounded-md p-1 text-body transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40",
});

/** A pre-computed, cross-table label — SidePanel only ever sees the selected table. */
export type RelationSummary = {
  id: string;
  label: string;
};

type SidePanelProps = {
  isOpen: boolean;
  schemaName: string;
  tableCount: number;
  /** Pre-formatted display date (e.g. "2026-07-01"); "—" while nothing is loaded. */
  createdDate: string;
  dialect: SqlDialect;
  selectedTable: Table | null;
  /** Count of selected tables; used to distinguish "2+ selected" from "nothing selected" when selectedTable is null. */
  selectedTableCount: number;
  /** The current schema's dialect strategy; resolves the identifier-comparison rule for a table rename. */
  strategy: DialectStrategy;
  /** Sibling table names to validate a rename against (REQ-018); excludes the selected table. */
  existingTableNames: string[];
  relations: RelationSummary[];
  onUpdateTableName: (tableId: string, name: string) => void;
  onUpdateTableComment: (tableId: string, comment: string) => void;
  onDeleteTable: () => void;
  onAddColumn: () => void;
  onEditColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumnUp: (tableId: string, columnId: string) => void;
  onMoveColumnDown: (tableId: string, columnId: string) => void;
  onAddKey: () => void;
  onEditKey: (keyId: string) => void;
  onDeleteKey: (keyId: string) => void;
  onDeleteRelation: (relationId: string) => void;
};

export function SidePanel({
  isOpen,
  schemaName,
  tableCount,
  createdDate,
  dialect,
  selectedTable,
  selectedTableCount,
  strategy,
  existingTableNames,
  relations,
  onUpdateTableName,
  onUpdateTableComment,
  onDeleteTable,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onMoveColumnUp,
  onMoveColumnDown,
  onAddKey,
  onEditKey,
  onDeleteKey,
  onDeleteRelation,
}: SidePanelProps) {
  return (
    <aside
      aria-label="Side panel"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={panel({ open: isOpen })}
    >
      {/* Fixed inner width so the content does not reflow while the outer width animates. */}
      <div className="h-full w-80 overflow-y-auto border-l border-edge p-4">
        {selectedTable === null ? (
          selectedTableCount >= 2 ? (
            <MultipleTablesSelected count={selectedTableCount} />
          ) : (
            <SchemaSummary
              schemaName={schemaName}
              tableCount={tableCount}
              createdDate={createdDate}
              dialect={dialect}
            />
          )
        ) : (
          <TableProperties
            key={selectedTable.id}
            table={selectedTable}
            strategy={strategy}
            existingTableNames={existingTableNames}
            relations={relations}
            onUpdateTableName={onUpdateTableName}
            onUpdateTableComment={onUpdateTableComment}
            onDeleteTable={onDeleteTable}
            onAddColumn={onAddColumn}
            onEditColumn={onEditColumn}
            onDeleteColumn={onDeleteColumn}
            onMoveColumnUp={onMoveColumnUp}
            onMoveColumnDown={onMoveColumnDown}
            onAddKey={onAddKey}
            onEditKey={onEditKey}
            onDeleteKey={onDeleteKey}
            onDeleteRelation={onDeleteRelation}
          />
        )}
      </div>
    </aside>
  );
}

type SchemaSummaryProps = {
  schemaName: string;
  tableCount: number;
  createdDate: string;
  dialect: SqlDialect;
};

function SchemaSummary({ schemaName, tableCount, createdDate, dialect }: SchemaSummaryProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("sidePanel");
  return (
    <>
      <h2 className="text-[16px]">{t("schemaHeading")}</h2>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[14px]">
        <dt>{tCommon("nameLabel")}</dt>
        <dd className="text-heading">{schemaName}</dd>
        <dt>{t("dialectLabel")}</dt>
        <dd className="text-heading">{SQL_DIALECT_LABELS[dialect]}</dd>
        <dt>{t("tablesLabel")}</dt>
        <dd className="text-heading">{tableCount}</dd>
        <dt>{t("createdLabel")}</dt>
        <dd className="text-heading">{createdDate}</dd>
      </dl>
    </>
  );
}

type MultipleTablesSelectedProps = {
  count: number;
};

function MultipleTablesSelected({ count }: MultipleTablesSelectedProps) {
  const t = useTranslations("sidePanel");
  return <h2 className="text-[16px]">{t("multipleTablesSelectedHeading", { count })}</h2>;
}

const sectionActionButton = tv({
  base: "mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-heading transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

type TablePropertiesProps = {
  table: Table;
  strategy: DialectStrategy;
  existingTableNames: string[];
  relations: RelationSummary[];
  onUpdateTableName: (tableId: string, name: string) => void;
  onUpdateTableComment: (tableId: string, comment: string) => void;
  onDeleteTable: () => void;
  onAddColumn: () => void;
  onEditColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onMoveColumnUp: (tableId: string, columnId: string) => void;
  onMoveColumnDown: (tableId: string, columnId: string) => void;
  onAddKey: () => void;
  onEditKey: (keyId: string) => void;
  onDeleteKey: (keyId: string) => void;
  onDeleteRelation: (relationId: string) => void;
};

function TableProperties({
  table,
  strategy,
  existingTableNames,
  relations,
  onUpdateTableName,
  onUpdateTableComment,
  onDeleteTable,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onMoveColumnUp,
  onMoveColumnDown,
  onAddKey,
  onEditKey,
  onDeleteKey,
  onDeleteRelation,
}: TablePropertiesProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("sidePanel");
  const [name, setName] = useState(table.name);
  const trimmedName = name.trim();
  const {
    isInvalidShape: isNameInvalidShape,
    isReserved: isNameReserved,
    isDuplicate: isNameDuplicate,
    isInvalid: isNameInvalid,
  } = describeNameValidity(trimmedName, existingTableNames, strategy);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px]">{t("tableHeading")}</h2>
        <button
          type="button"
          aria-label={t("deleteTableAriaLabel")}
          onClick={onDeleteTable}
          className={iconButton()}
        >
          <LuTrash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-4 text-[14px]">
        <label className="block">
          {tCommon("nameLabel")}
          <input
            type="text"
            value={name}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              const trimmed = value.trim();
              if (!describeNameValidity(trimmed, existingTableNames, strategy).isInvalid) {
                onUpdateTableName(table.id, trimmed);
              }
            }}
            onBlur={() => {
              if (isNameInvalid) {
                setName(table.name);
              }
            }}
            className={fieldInput()}
          />
        </label>
        {isNameInvalidShape && (
          <p className="text-[12px] text-body">{tCommon("invalidNameShapeHint")}</p>
        )}
        {isNameReserved && <p className="text-[12px] text-body">{tCommon("reservedNameHint")}</p>}
        {isNameDuplicate && (
          <p className="text-[12px] text-body">{tCommon("duplicateTableName")}</p>
        )}
        <label className="block">
          {tCommon("commentLabel")}
          <textarea
            value={table.comment}
            onChange={(event) => onUpdateTableComment(table.id, event.target.value)}
            rows={4}
            className={fieldInput()}
          />
        </label>
      </div>
      <div className="mt-6">
        <h3 className="text-[14px] text-heading">{t("columnsHeading")}</h3>
        <button type="button" onClick={onAddColumn} className={sectionActionButton()}>
          <LuPlus aria-hidden="true" className="size-4" />
          {t("addColumn")}
        </button>
        <ul className="mt-2 flex flex-col gap-1 text-[13px]">
          {table.columns.map((column, index) => (
            <li key={column.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                <span className="text-heading">{column.name}</span>{" "}
                <span className="text-body">{column.type}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={t("moveColumnUpAriaLabel", { name: column.name })}
                  disabled={index === 0}
                  onClick={() => onMoveColumnUp(table.id, column.id)}
                  className={iconButton()}
                >
                  <LuChevronUp aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("moveColumnDownAriaLabel", { name: column.name })}
                  disabled={index === table.columns.length - 1}
                  onClick={() => onMoveColumnDown(table.id, column.id)}
                  className={iconButton()}
                >
                  <LuChevronDown aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("editColumnAriaLabel", { name: column.name })}
                  onClick={() => onEditColumn(column.id)}
                  className={iconButton()}
                >
                  <LuPencil aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("deleteColumnAriaLabel", { name: column.name })}
                  onClick={() => onDeleteColumn(column.id)}
                  className={iconButton()}
                >
                  <LuTrash2 aria-hidden="true" className="size-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6">
        <h3 className="text-[14px] text-heading">{t("keysHeading")}</h3>
        <button type="button" onClick={onAddKey} className={sectionActionButton()}>
          <LuPlus aria-hidden="true" className="size-4" />
          {t("addKey")}
        </button>
        <ul className="mt-2 flex flex-col gap-1 text-[13px]">
          {table.keys.map((key) => (
            <KeyRow
              key={key.id}
              keyId={key.id}
              label={describeKey(key, table.columns)}
              onEditKey={onEditKey}
              onDeleteKey={onDeleteKey}
            />
          ))}
        </ul>
      </div>
      <div className="mt-6">
        <h3 className="text-[14px] text-heading">{t("relationsHeading")}</h3>
        <ul className="mt-2 flex flex-col gap-1 text-[13px]">
          {relations.map((relation) => (
            <RelationRow
              key={relation.id}
              relationId={relation.id}
              label={relation.label}
              onDeleteRelation={onDeleteRelation}
            />
          ))}
        </ul>
      </div>
    </>
  );
}

type KeyRowProps = {
  keyId: string;
  label: string;
  onEditKey: (keyId: string) => void;
  onDeleteKey: (keyId: string) => void;
};

function KeyRow({ keyId, label, onEditKey, onDeleteKey }: KeyRowProps) {
  const t = useTranslations("sidePanel");
  return (
    <li className="flex items-center justify-between gap-2">
      <span title={label} className="truncate text-heading">
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={t("editKeyAriaLabel", { label })}
          onClick={() => onEditKey(keyId)}
          className={iconButton()}
        >
          <LuPencil aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={t("deleteKeyAriaLabel", { label })}
          onClick={() => onDeleteKey(keyId)}
          className={iconButton()}
        >
          <LuTrash2 aria-hidden="true" className="size-4" />
        </button>
      </span>
    </li>
  );
}

type RelationRowProps = {
  relationId: string;
  label: string;
  onDeleteRelation: (relationId: string) => void;
};

function RelationRow({ relationId, label, onDeleteRelation }: RelationRowProps) {
  const t = useTranslations("sidePanel");
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="truncate text-heading">{label}</span>
      <button
        type="button"
        aria-label={t("deleteRelationAriaLabel", { label })}
        onClick={() => onDeleteRelation(relationId)}
        className={iconButton()}
      >
        <LuTrash2 aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}
