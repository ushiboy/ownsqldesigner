import { useEffect } from "react";
import { Background, ReactFlow, useNodesState } from "@xyflow/react";
import type { Connection, Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  type ForeignKey,
  isReferenceableColumn,
  type Position,
  type Table,
} from "../../../../domain/schema";
import { selectCommittedMoves } from "./nodeChanges";
import { columnIdFromHandle, sourceHandleId, targetHandleId } from "./TableNode/columnHandleId";
import { TableNode, type TableNodeType } from "./TableNode";

const nodeTypes = { table: TableNode };

type CanvasProps = {
  tables: Table[];
  selectedTableId: string | null;
  selectedRelationId: string | null;
  /** null deselects (pane click). */
  onSelectTable: (id: string | null) => void;
  /** null deselects (pane click). */
  onSelectRelation: (id: string | null) => void;
  onMoveTable: (tableId: string, position: Position) => void;
  onAddForeignKey: (tableId: string, fields: Omit<ForeignKey, "id">) => void;
};

export function Canvas({
  tables,
  selectedTableId,
  selectedRelationId,
  onSelectTable,
  onSelectRelation,
  onMoveTable,
  onAddForeignKey,
}: CanvasProps) {
  // With fully controlled `nodes`, React Flow doesn't move a dragged node
  // on its own — without local state applying intermediate drag ticks, it
  // stays put until drop. Local state + resync effect is React Flow's own
  // pattern for nodes "controlled from outside". Edges need no such local
  // state: they're anchored to node/handle ids, not fixed coordinates, so
  // they follow dragged nodes automatically.
  const [nodes, setNodes, handleNodesChange] = useNodesState<TableNodeType>(
    tablesToNodes(tables, selectedTableId),
  );
  const edges = tablesToEdges(tables, selectedRelationId);

  useEffect(() => {
    setNodes(tablesToNodes(tables, selectedTableId));
  }, [tables, selectedTableId, setNodes]);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        // Table deletion goes through the page's own useDeleteKeyShortcut
        // and a confirm dialog; React Flow's built-in Backspace handling is
        // disabled so it doesn't also act on this locally-synced `nodes`
        // state (used only to animate in-progress drags) and cause a
        // flicker before the confirm flow runs.
        deleteKeyCode={null}
        onNodesChange={(changes) => {
          handleNodesChange(changes);
          for (const { id, position } of selectCommittedMoves(changes)) {
            onMoveTable(id, position);
          }
        }}
        onNodeClick={(_, node) => {
          onSelectRelation(null);
          onSelectTable(node.id);
        }}
        onConnect={(connection) => {
          const columnId = columnIdFromHandle(connection.sourceHandle);
          const referencedColumnId = columnIdFromHandle(connection.targetHandle);
          if (columnId !== null && referencedColumnId !== null) {
            onAddForeignKey(connection.source, {
              columnId,
              referencedTableId: connection.target,
              referencedColumnId,
            });
          }
        }}
        isValidConnection={(connection) => isValidForeignKeyConnection(tables, connection)}
        onEdgeClick={(_, edge) => {
          onSelectTable(null);
          onSelectRelation(edge.id);
        }}
        onPaneClick={() => {
          onSelectTable(null);
          onSelectRelation(null);
        }}
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
      columns: table.columns.map(({ id, name }) => ({
        id,
        name,
        referenceable: isReferenceableColumn(table, id),
      })),
    },
    selected: table.id === selectedTableId,
  }));
}

function tablesToEdges(tables: Table[], selectedRelationId: string | null): Edge[] {
  return tables.flatMap((table) =>
    table.foreignKeys.map((foreignKey) => {
      const isSelected = foreignKey.id === selectedRelationId;
      return {
        id: foreignKey.id,
        source: table.id,
        sourceHandle: sourceHandleId(foreignKey.columnId),
        target: foreignKey.referencedTableId,
        targetHandle: targetHandleId(foreignKey.referencedColumnId),
        selected: isSelected,
        style: {
          stroke: isSelected ? "var(--color-accent)" : "var(--color-edge)",
          strokeWidth: isSelected ? 2 : 1,
        },
      };
    }),
  );
}

function isValidForeignKeyConnection(tables: Table[], connection: Connection | Edge): boolean {
  const columnId = columnIdFromHandle(connection.sourceHandle);
  const referencedColumnId = columnIdFromHandle(connection.targetHandle);
  if (columnId === null || referencedColumnId === null || columnId === referencedColumnId) {
    return false;
  }
  const referencedTable = tables.find((table) => table.id === connection.target);
  return (
    referencedTable !== undefined && isReferenceableColumn(referencedTable, referencedColumnId)
  );
}
