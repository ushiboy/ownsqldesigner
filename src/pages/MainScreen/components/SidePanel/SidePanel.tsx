import { useState } from "react";
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu";
import { tv } from "tailwind-variants";
import type { Table } from "../../../../domain/schema";
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
  base: "inline-flex items-center rounded-md p-1 text-body transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

type SidePanelProps = {
  isOpen: boolean;
  schemaName: string;
  tableCount: number;
  /** Pre-formatted display date (e.g. "2026-07-01"); "—" while nothing is loaded. */
  createdDate: string;
  selectedTable: Table | null;
  onUpdateTableName: (tableId: string, name: string) => void;
  onUpdateTableComment: (tableId: string, comment: string) => void;
  onAddColumn: () => void;
  onEditColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddKey: () => void;
  onEditKey: (keyId: string) => void;
  onDeleteKey: (keyId: string) => void;
};

export function SidePanel({
  isOpen,
  schemaName,
  tableCount,
  createdDate,
  selectedTable,
  onUpdateTableName,
  onUpdateTableComment,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onAddKey,
  onEditKey,
  onDeleteKey,
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
          <SchemaSummary
            schemaName={schemaName}
            tableCount={tableCount}
            createdDate={createdDate}
          />
        ) : (
          <TableProperties
            key={selectedTable.id}
            table={selectedTable}
            onUpdateTableName={onUpdateTableName}
            onUpdateTableComment={onUpdateTableComment}
            onAddColumn={onAddColumn}
            onEditColumn={onEditColumn}
            onDeleteColumn={onDeleteColumn}
            onAddKey={onAddKey}
            onEditKey={onEditKey}
            onDeleteKey={onDeleteKey}
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
};

function SchemaSummary({ schemaName, tableCount, createdDate }: SchemaSummaryProps) {
  return (
    <>
      <h2 className="text-[16px]">Schema</h2>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[14px]">
        <dt>Name</dt>
        <dd className="text-heading">{schemaName}</dd>
        <dt>Tables</dt>
        <dd className="text-heading">{tableCount}</dd>
        <dt>Created</dt>
        <dd className="text-heading">{createdDate}</dd>
      </dl>
    </>
  );
}

const sectionActionButton = tv({
  base: "mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] text-heading transition-colors hover:bg-accent-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
});

type TablePropertiesProps = {
  table: Table;
  onUpdateTableName: (tableId: string, name: string) => void;
  onUpdateTableComment: (tableId: string, comment: string) => void;
  onAddColumn: () => void;
  onEditColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddKey: () => void;
  onEditKey: (keyId: string) => void;
  onDeleteKey: (keyId: string) => void;
};

function TableProperties({
  table,
  onUpdateTableName,
  onUpdateTableComment,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onAddKey,
  onEditKey,
  onDeleteKey,
}: TablePropertiesProps) {
  const [name, setName] = useState(table.name);

  return (
    <>
      <h2 className="text-[16px]">Table</h2>
      <div className="mt-4 flex flex-col gap-4 text-[14px]">
        <label className="block">
          Name
          <input
            type="text"
            value={name}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              const trimmed = value.trim();
              if (trimmed !== "") {
                onUpdateTableName(table.id, trimmed);
              }
            }}
            onBlur={() => {
              if (name.trim() === "") {
                setName(table.name);
              }
            }}
            className={fieldInput()}
          />
        </label>
        <label className="block">
          Comment
          <textarea
            value={table.comment}
            onChange={(event) => onUpdateTableComment(table.id, event.target.value)}
            rows={4}
            className={fieldInput()}
          />
        </label>
      </div>
      <div className="mt-6">
        <h3 className="text-[14px] text-heading">Columns</h3>
        <button type="button" onClick={onAddColumn} className={sectionActionButton()}>
          <LuPlus aria-hidden="true" className="size-4" />
          Add Column
        </button>
        <ul className="mt-2 flex flex-col gap-1 text-[13px]">
          {table.columns.map((column) => (
            <li key={column.id} className="flex items-center justify-between gap-2">
              <span className="truncate">
                <span className="text-heading">{column.name}</span>{" "}
                <span className="text-body">{column.type}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Edit column ${column.name}`}
                  onClick={() => onEditColumn(column.id)}
                  className={iconButton()}
                >
                  <LuPencil aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete column ${column.name}`}
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
        <h3 className="text-[14px] text-heading">Keys</h3>
        <button type="button" onClick={onAddKey} className={sectionActionButton()}>
          <LuPlus aria-hidden="true" className="size-4" />
          Add Key
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
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="truncate text-heading">{label}</span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`Edit key ${label}`}
          onClick={() => onEditKey(keyId)}
          className={iconButton()}
        >
          <LuPencil aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete key ${label}`}
          onClick={() => onDeleteKey(keyId)}
          className={iconButton()}
        >
          <LuTrash2 aria-hidden="true" className="size-4" />
        </button>
      </span>
    </li>
  );
}
