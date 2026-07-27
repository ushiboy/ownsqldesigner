import { Handle, type Node, type NodeProps, Position, useConnection } from "@xyflow/react";
import { LuArrowRight, LuKeyRound } from "react-icons/lu";
import { tv } from "tailwind-variants";
import { sourceHandleId, targetHandleId } from "./columnHandleId";
import { isKeyColumnDragInProgress } from "./dropTarget";

export type TableNodeColumn = {
  id: string;
  name: string;
  /** Whether the column is a valid foreign-key target (REQ-020: sole PRIMARY KEY or UNIQUE column). */
  referenceable: boolean;
};

export type TableNodeData = {
  name: string;
  comment: string;
  columns: TableNodeColumn[];
};

export type TableNodeType = Node<TableNodeData, "table">;

const card = tv({
  base: "relative min-w-40 rounded-md border bg-surface px-3 py-2 text-left shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  variants: {
    selected: {
      true: "border-accent",
      false: "border-edge",
    },
    dropTarget: {
      true: "border-dashed border-accent bg-accent-bg",
    },
  },
});

// Overrides @xyflow/react's default plain 6px dot: bigger hit target, plus an
// icon (arrow = drag from here / key = drop here) so the two roles at each
// column's left/right edge are visually distinguishable, not just by side.
const columnHandle = tv({
  base: "!flex !size-3.5 !items-center !justify-center !rounded-full !border !border-accent-border !bg-accent-bg !text-accent",
})();

export function TableNode({ data, selected }: NodeProps<TableNodeType>) {
  // REQ-016: while a drag from a key handle is in progress, every table
  // (including the one the drag started from — self-reference is allowed)
  // is a valid drop target, so highlight all of them to make the gesture's
  // destination obvious without requiring a hover tooltip to discover it.
  const isDropTarget = useConnection(isKeyColumnDragInProgress);

  return (
    <button
      type="button"
      aria-label={`Table ${data.name}`}
      className={card({ selected, dropTarget: isDropTarget })}
    >
      <div className="text-[14px] text-heading">{data.name}</div>
      {isDropTarget && (
        // Absolutely positioned, outside the card's own box: appearing here
        // must never add height that reflows the column list below — doing
        // so would shift every handle's position out from under an
        // in-progress drag, defeating the whole point of this indicator.
        <div className="pointer-events-none absolute inset-x-0 bottom-full mb-1 text-center text-[11px] font-medium text-accent">
          Drop on a column to link it, or here to add a new one
        </div>
      )}
      {data.comment !== "" && <div className="mt-1 text-[12px] text-body">{data.comment}</div>}
      {data.columns.length > 0 && (
        <ul className="mt-2 border-t border-edge pt-2">
          {data.columns.map((column) => (
            <li key={column.id} className="relative px-2 text-[12px] text-body">
              {column.name}
              <Handle
                type="source"
                position={Position.Right}
                id={sourceHandleId(column.id)}
                className={columnHandle}
                title="Drag from here to connect this column to another table"
              >
                <LuArrowRight aria-hidden="true" className="pointer-events-none size-2.5" />
              </Handle>
              {column.referenceable && (
                <Handle
                  type="target"
                  position={Position.Left}
                  id={targetHandleId(column.id)}
                  className={columnHandle}
                  title="Key column — drop a connection here, or drag from here to create a linked column on another table"
                >
                  <LuKeyRound aria-hidden="true" className="pointer-events-none size-2.5" />
                </Handle>
              )}
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}
