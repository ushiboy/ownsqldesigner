import { useEffect } from "react";
import { Background, ReactFlow, useNodesState } from "@xyflow/react";
import type { Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Position, Table } from "../../../../domain/schema";
import { selectCommittedMoves } from "./nodeChanges";
import { TableNode, type TableNodeType } from "./TableNode";

const nodeTypes = { table: TableNode };
const edges: Edge[] = [];

type CanvasProps = {
  tables: Table[];
  selectedTableId: string | null;
  /** null deselects (pane click). */
  onSelectTable: (id: string | null) => void;
  onMoveTable: (tableId: string, position: Position) => void;
};

export function Canvas({ tables, selectedTableId, onSelectTable, onMoveTable }: CanvasProps) {
  // With fully controlled `nodes`, React Flow doesn't move a dragged node
  // on its own — without local state applying intermediate drag ticks, it
  // stays put until drop. Local state + resync effect is React Flow's own
  // pattern for nodes "controlled from outside".
  const [nodes, setNodes, handleNodesChange] = useNodesState<TableNodeType>(
    tablesToNodes(tables, selectedTableId),
  );

  useEffect(() => {
    setNodes(tablesToNodes(tables, selectedTableId));
  }, [tables, selectedTableId, setNodes]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        onNodesChange={(changes) => {
          handleNodesChange(changes);
          for (const { id, position } of selectCommittedMoves(changes)) {
            onMoveTable(id, position);
          }
        }}
        onNodeClick={(_, node) => onSelectTable(node.id)}
        onPaneClick={() => onSelectTable(null)}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}

function tablesToNodes(tables: Table[], selectedTableId: string | null): TableNodeType[] {
  return tables.map((table) => ({
    id: table.id,
    type: "table",
    position: table.position,
    data: {
      name: table.name,
      comment: table.comment,
      columns: table.columns.map(({ id, name }) => ({ id, name })),
    },
    selected: table.id === selectedTableId,
  }));
}
