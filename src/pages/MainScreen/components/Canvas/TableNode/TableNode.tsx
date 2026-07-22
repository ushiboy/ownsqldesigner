import type { Node, NodeProps } from "@xyflow/react";
import { tv } from "tailwind-variants";

export type TableNodeData = {
  name: string;
  comment: string;
  columns: { id: string; name: string }[];
};

export type TableNodeType = Node<TableNodeData, "table">;

const card = tv({
  base: "min-w-40 rounded-md border bg-surface px-3 py-2 text-left shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  variants: {
    selected: {
      true: "border-accent",
      false: "border-edge",
    },
  },
});

export function TableNode({ data, selected }: NodeProps<TableNodeType>) {
  return (
    <button type="button" aria-label={`Table ${data.name}`} className={card({ selected })}>
      <div className="text-[14px] text-heading">{data.name}</div>
      {data.comment !== "" && <div className="mt-1 text-[12px] text-body">{data.comment}</div>}
      {data.columns.length > 0 && (
        <ul className="mt-2 border-t border-edge pt-2">
          {data.columns.map((column) => (
            <li key={column.id} className="text-[12px] text-body">
              {column.name}
            </li>
          ))}
        </ul>
      )}
    </button>
  );
}
