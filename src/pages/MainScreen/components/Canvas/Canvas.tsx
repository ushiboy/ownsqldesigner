import { Background, ReactFlow } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const nodes: Node[] = [];
const edges: Edge[] = [];

export function Canvas() {
  return (
    <div className="h-full w-full">
      <ReactFlow nodes={nodes} edges={edges}>
        <Background />
      </ReactFlow>
    </div>
  );
}
