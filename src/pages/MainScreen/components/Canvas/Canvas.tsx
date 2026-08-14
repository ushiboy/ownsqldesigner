import { useEffect, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useNodesState,
  useReactFlow,
  useStoreApi,
} from "@xyflow/react";
import type { Connection, Edge, HandleType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  type ForeignKey,
  formatColumnType,
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  isReferenceableColumn,
  type Position,
  type Table,
} from "../../../../domain/schema";
import { useCanvasApiRef } from "../../CanvasApiContext";
import { computeAutoAlignedPositions, type NodeSize } from "./autoAlignLayout";
import { resolveForeignKeyDrop } from "./connectionEnd";
import { selectCommittedMoves, SNAP_GRID_SIZE, snapPosition } from "./nodeChanges";
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
  selectedRelationId: string | null;
  /**
   * Table ids selected when Canvas first mounts (stories/tests that start
   * with a selection made). Read once, into the initial nodes only — see
   * the comment on the `useNodesState` call below for why.
   */
  initialSelectedTableIds?: string[];
  /** Whether each column's type/size is shown on the canvas (REQ-012). */
  showColumnDetails: boolean;
  /** Whether a table's committed drag-end position snaps to the grid (REQ-006). */
  snapToGrid: boolean;
  /** Fires with every selection-changing gesture: click, shift-click, rubber-band, pane click ([]). */
  onTableSelectionChange: (ids: string[]) => void;
  /** null deselects (pane click). */
  onSelectRelation: (id: string | null) => void;
  onMoveTables: (moves: { tableId: string; position: Position }[]) => void;
  onAddForeignKey: (tableId: string, fields: Omit<ForeignKey, "id">) => void;
  onAddForeignKeyWithNewColumn: (
    childTableId: string,
    referencedTableId: string,
    referencedColumnId: string,
  ) => void;
};

export function Canvas({
  tables,
  selectedRelationId,
  initialSelectedTableIds,
  showColumnDetails,
  snapToGrid,
  onTableSelectionChange,
  onSelectRelation,
  onMoveTables,
  onAddForeignKey,
  onAddForeignKeyWithNewColumn,
}: CanvasProps) {
  // With fully controlled `nodes`, React Flow doesn't move a dragged node
  // on its own — without local state applying intermediate drag ticks, it
  // stays put until drop. Local state + resync effect is React Flow's own
  // pattern for nodes "controlled from outside". Edges need no such local
  // state: they're anchored to node/handle ids, not fixed coordinates, so
  // they follow dragged nodes automatically.
  //
  // `selected` is never computed by this app on an ongoing basis — see
  // `tablesToNodes` for why: React Flow, not this app, is the source of
  // truth for which table nodes are selected (see
  // docs/design/0016-undo-redo.md). The one exception is the very first
  // node array: `useNodesState`'s initializer runs exactly once, before
  // React Flow exists to own anything, so it's the only place this app may
  // set `.selected` without risking the resync-timing oscillation that
  // ruled out feeding it in on an ongoing basis. Doing this also makes
  // React Flow's own "echo the initial selection once on mount" (see
  // docs/design/0015-multi-select-and-group-move.md) report a selection
  // that already matches `initialSelectedTableIds`, instead of an empty one
  // that would otherwise bounce SelectionContext's table selection to empty
  // and back — clearing column/key selection as a side effect of a change
  // that never really happened.
  const [nodes, setNodes, handleNodesChange] = useNodesState<TableNodeType>(
    tablesToNodes(tables, initialSelectedTableIds, showColumnDetails),
  );
  const edges = tablesToEdges(tables, selectedRelationId);
  // Set in onConnectStart, read in isValidConnection (both fire mid-drag,
  // outside React's render cycle) to reject completing a normal connection
  // when a drag started from a key handle — that direction is handled
  // entirely by onConnectEnd's own drop resolution instead (see
  // docs/design/0012-foreign-key-child-column-generation.md).
  const dragStartHandleTypeRef = useRef<HandleType | null>(null);

  useEffect(() => {
    // Resyncing from `tables` rebuilds every node from scratch, so a schema
    // edit made while a table is selected would otherwise wipe React Flow's
    // own `.selected` tracking for it on the very next render (any edit
    // changes `tables`, not just ones touching that table). Carrying the
    // previous `.selected` value forward by id preserves it without this
    // app ever writing selection state into nodes itself.
    setNodes((currentNodes) => {
      const selectedIds = currentNodes
        .filter((node) => node.selected === true)
        .map((node) => node.id);
      return tablesToNodes(tables, selectedIds, showColumnDetails);
    });
  }, [tables, showColumnDetails, setNodes]);

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
        // One modifier for both click-accumulate and rubber-band, matching
        // REQ-004's "Shift+click". Table selection itself is not read from
        // onNodeClick/onPaneClick below — React Flow's own selection engine
        // already implements click/shift-click/box-select, and it reports
        // every resulting selection through onSelectionChange.
        multiSelectionKeyCode="Shift"
        onSelectionChange={({ nodes: selectedNodes }) => {
          onTableSelectionChange(selectedNodes.map((node) => node.id));
        }}
        onNodesChange={(changes) => {
          handleNodesChange(changes);
          const moves = selectCommittedMoves(changes);
          if (moves.length > 0) {
            onMoveTables(
              moves.map(({ id, position }) => ({
                tableId: id,
                position: snapToGrid ? snapPosition(position, SNAP_GRID_SIZE) : position,
              })),
            );
          }
        }}
        onNodeClick={() => {
          onSelectRelation(null);
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
          onSelectRelation(edge.id);
        }}
        onPaneClick={() => {
          onSelectRelation(null);
        }}
      >
        <Background
          gap={SNAP_GRID_SIZE}
          variant={snapToGrid ? BackgroundVariant.Lines : BackgroundVariant.Dots}
        />
        <MiniMap
          pannable
          bgColor="var(--color-surface)"
          nodeColor="var(--color-accent)"
          nodeStrokeColor="var(--color-accent)"
          maskColor="var(--color-accent-bg)"
        />
        <Controls showInteractive={false} />
        <CanvasApiBridge tables={tables} onMoveTables={onMoveTables} />
      </ReactFlow>
    </div>
  );
}

// `selectedIds` is only ever passed by the `useNodesState` initializer
// above, for the initial mount — React Flow owns which table nodes are
// selected as its own internal (uncontrolled) state from that point on,
// driven by its own click/shift-click/rubber-band handling via
// onNodesChange's "select"-type changes; this app only reads that state
// back out through onSelectionChange (above) and onTableSelectionChange.
// Feeding an ongoing `selectedTableIds` value from this app back into
// `nodes[].selected` on every resync was tried first and made React Flow's
// own selection reconciliation oscillate when a resync landed at the wrong
// moment relative to its dimension remeasurement (see
// docs/design/0016-undo-redo.md) — a React Flow-internal failure mode, not
// something this app can validate against. Programmatic deselection
// (undo/redo) goes through `CanvasApiBridge` below, which calls React
// Flow's own native deselect instead.
function tablesToNodes(
  tables: Table[],
  selectedIds: string[] | undefined,
  showColumnDetails: boolean,
): TableNodeType[] {
  const selected = new Set(selectedIds);
  return tables.map((table) => ({
    id: table.id,
    type: "table",
    position: table.position,
    selected: selected.has(table.id),
    data: {
      name: table.name,
      comment: table.comment,
      columns: table.columns.map(({ id, name, type, size, precision }) => ({
        id,
        name,
        referenceable: isReferenceableColumn(table, id),
        typeLabel: showColumnDetails ? formatColumnType({ type, size, precision }) : null,
      })),
    },
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

type CanvasApiBridgeProps = {
  tables: Table[];
  onMoveTables: (moves: { tableId: string; position: Position }[]) => void;
};

// A child of <ReactFlow> (needed to reach its store via useStoreApi and its
// measured node sizes via useReactFlow) that registers imperative canvas
// actions into CanvasApiContext, so callers outside the React Flow tree
// (undo/redo, the auto-align toolbar button) can act through React Flow's
// own APIs rather than a controlled prop — see the comment on
// `tablesToNodes` above.
function CanvasApiBridge({ tables, onMoveTables }: CanvasApiBridgeProps) {
  const apiRef = useCanvasApiRef();
  const store = useStoreApi();
  const { getNodes } = useReactFlow();
  useEffect(() => {
    apiRef.current = {
      deselectAllTables: () => store.getState().unselectNodesAndEdges(),
      autoAlignTables: () => {
        const nodeSizes = new Map<string, NodeSize>(
          getNodes().map((node) => [
            node.id,
            {
              width: node.measured?.width ?? GRID_CELL_WIDTH,
              height: node.measured?.height ?? GRID_CELL_HEIGHT,
            },
          ]),
        );
        onMoveTables(computeAutoAlignedPositions(tables, nodeSizes));
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, store, getNodes, tables, onMoveTables]);
  return null;
}
