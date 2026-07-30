import { useEffect, useRef } from "react";
import { Background, Controls, ReactFlow, useNodesState } from "@xyflow/react";
import type { Connection, Edge, HandleType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  type ForeignKey,
  isReferenceableColumn,
  type Position,
  type Table,
} from "../../../../domain/schema";
import { resolveForeignKeyDrop } from "./connectionEnd";
import { selectCommittedMoves } from "./nodeChanges";
import {
  columnIdFromHandle,
  sourceColumnIdFromHandle,
  sourceHandleId,
  targetHandleId,
} from "./TableNode/columnHandleId";
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
  onAddForeignKeyWithNewColumn: (
    childTableId: string,
    referencedTableId: string,
    referencedColumnId: string,
  ) => void;
};

export function Canvas({
  tables,
  selectedTableId,
  selectedRelationId,
  onSelectTable,
  onSelectRelation,
  onMoveTable,
  onAddForeignKey,
  onAddForeignKeyWithNewColumn,
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
  // Set in onConnectStart, read in isValidConnection (both fire mid-drag,
  // outside React's render cycle) to reject completing a normal connection
  // when a drag started from a key handle — that direction is handled
  // entirely by onConnectEnd's own drop resolution instead (see
  // docs/design/0012-foreign-key-child-column-generation.md).
  const dragStartHandleTypeRef = useRef<HandleType | null>(null);

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
        onConnectStart={(_, { handleType }) => {
          dragStartHandleTypeRef.current = handleType;
        }}
        isValidConnection={(connection) =>
          dragStartHandleTypeRef.current !== "target" &&
          isValidForeignKeyConnection(tables, connection)
        }
        onConnectEnd={(event, connectionState) => {
          dragStartHandleTypeRef.current = null;
          // xyflow's own connection state can't tell "dropped on a table's
          // body" from "dropped on the empty pane" (toNode is only set from
          // a hit-tested handle), and isValidConnection above always rejects
          // this drag direction — resolving the drop needs DOM lookups of
          // the node and, separately, the column handle under the pointer.
          const dropTableId =
            event.target instanceof Element
              ? (event.target.closest(".react-flow__node")?.getAttribute("data-id") ?? null)
              : null;
          const dropColumnId =
            event.target instanceof Element
              ? sourceColumnIdFromHandle(
                  event.target.closest(".react-flow__handle")?.getAttribute("data-handleid"),
                )
              : null;
          const drop = resolveForeignKeyDrop(connectionState, dropTableId, dropColumnId);
          if (drop === null) {
            return;
          }
          if (drop.kind === "existingColumn") {
            onAddForeignKey(drop.childTableId, {
              columnId: drop.columnId,
              referencedTableId: drop.referencedTableId,
              referencedColumnId: drop.referencedColumnId,
            });
          } else {
            onAddForeignKeyWithNewColumn(
              drop.childTableId,
              drop.referencedTableId,
              drop.referencedColumnId,
            );
          }
        }}
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
        <Controls showInteractive={false} />
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
