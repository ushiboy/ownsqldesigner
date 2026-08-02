import { graphlib, layout } from "@dagrejs/dagre";
import {
  GRID_CELL_HEIGHT,
  GRID_CELL_WIDTH,
  type Position,
  type Table,
} from "../../../../domain/schema";

const NODE_SEPARATION = 60;
const RANK_SEPARATION = 100;

export type NodeSize = { width: number; height: number };

export function computeAutoAlignedPositions(
  tables: Table[],
  nodeSizes: ReadonlyMap<string, NodeSize>,
): { tableId: string; position: Position }[] {
  const graph = new graphlib.Graph();
  // "LR", not "TB": TableNode always renders a column's FK source handle on
  // its right edge and a target handle on its left edge, regardless of
  // where the node ends up — a vertical (TB) layout forces the connector to
  // loop sideways between a bottom-right source and a top-left target,
  // which reads as backwards. Ranking left-to-right keeps every connector a
  // short, direct line from one side to the other.
  graph.setGraph({ rankdir: "LR", nodesep: NODE_SEPARATION, ranksep: RANK_SEPARATION });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const table of tables) {
    const { width, height } = nodeSizes.get(table.id) ?? {
      width: GRID_CELL_WIDTH,
      height: GRID_CELL_HEIGHT,
    };
    graph.setNode(table.id, { width, height });
  }

  for (const table of tables) {
    for (const foreignKey of table.foreignKeys) {
      if (foreignKey.referencedTableId !== table.id) {
        // Child (referencing) -> parent (referenced), the domain model's
        // own FK direction (unlike a TB layout, this is not inverted):
        // dagre's LR layout ranks an edge's source to the left of its
        // target, and the child's source handle is on its right edge, so
        // the child belongs to the left of the parent it points into.
        graph.setEdge(table.id, foreignKey.referencedTableId);
      }
    }
  }

  layout(graph);

  return tables.map((table) => {
    const node = graph.node(table.id);
    return {
      tableId: table.id,
      position: { x: node.x - node.width / 2, y: node.y - node.height / 2 },
    };
  });
}
