import { useState } from "react";
import { tv } from "tailwind-variants";
import type { Table } from "../../../../domain/schema";

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

type SidePanelProps = {
  isOpen: boolean;
  schemaName: string;
  tableCount: number;
  /** Pre-formatted display date (e.g. "2026-07-01"); "—" while nothing is loaded. */
  createdDate: string;
  selectedTable: Table | null;
  onUpdateTableName: (tableId: string, name: string) => void;
  onUpdateTableComment: (tableId: string, comment: string) => void;
};

export function SidePanel({
  isOpen,
  schemaName,
  tableCount,
  createdDate,
  selectedTable,
  onUpdateTableName,
  onUpdateTableComment,
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

type TablePropertiesProps = {
  table: Table;
  onUpdateTableName: (tableId: string, name: string) => void;
  onUpdateTableComment: (tableId: string, comment: string) => void;
};

function TableProperties({ table, onUpdateTableName, onUpdateTableComment }: TablePropertiesProps) {
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
    </>
  );
}
