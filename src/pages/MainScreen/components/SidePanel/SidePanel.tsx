import { tv } from "tailwind-variants";

const panel = tv({
  base: "shrink-0 overflow-hidden bg-surface transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
  variants: {
    open: {
      true: "w-80",
      false: "w-0",
    },
  },
});

type SidePanelProps = {
  isOpen: boolean;
  schemaName: string;
  tableCount: number;
  /** Pre-formatted display date (e.g. "2026-07-01"); "—" while nothing is loaded. */
  createdDate: string;
};

export function SidePanel({ isOpen, schemaName, tableCount, createdDate }: SidePanelProps) {
  return (
    <aside
      aria-label="Side panel"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={panel({ open: isOpen })}
    >
      {/* Fixed inner width so the content does not reflow while the outer width animates. */}
      <div className="h-full w-80 overflow-y-auto border-l border-edge p-4">
        <h2 className="text-[16px]">Schema</h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[14px]">
          <dt>Name</dt>
          <dd className="text-heading">{schemaName}</dd>
          <dt>Tables</dt>
          <dd className="text-heading">{tableCount}</dd>
          <dt>Created</dt>
          <dd className="text-heading">{createdDate}</dd>
        </dl>
      </div>
    </aside>
  );
}
