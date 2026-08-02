import { useMemo } from "react";
import type { Edge } from "@xyflow/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Background, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LocaleProvider } from "../../../../../i18n/LocaleProvider";
import { TableNode, type TableNodeType } from "./TableNode";

const nodeTypes = { table: TableNode };
const edges: Edge[] = [];

function makeNode(overrides: Partial<TableNodeType> = {}): TableNodeType {
  return {
    id: "1",
    type: "table",
    position: { x: 0, y: 0 },
    data: { name: "users", comment: "", columns: [] },
    ...overrides,
  };
}

type StoryArgs = { node: TableNodeType };

function TableNodePreview({ node }: StoryArgs) {
  const nodes = useMemo(() => [node], [node]);
  return (
    <LocaleProvider>
      <div className="h-[200px] w-[300px]">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} nodesDraggable={false} fitView>
          <Background />
        </ReactFlow>
      </div>
    </LocaleProvider>
  );
}

const meta = {
  title: "pages/MainScreen/Canvas/TableNode",
  render: (args) => <TableNodePreview {...args} />,
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { node: makeNode() },
};

export const WithComment: Story = {
  args: { node: makeNode({ data: { name: "users", comment: "Registered users", columns: [] } }) },
};

export const Selected: Story = {
  args: { node: makeNode({ selected: true }) },
};

export const WithColumns: Story = {
  args: {
    node: makeNode({
      data: {
        name: "users",
        comment: "",
        columns: [
          { id: "c1", name: "id", referenceable: false },
          { id: "c2", name: "email", referenceable: false },
        ],
      },
    }),
  },
};

export const WithReferenceableColumn: Story = {
  args: {
    node: makeNode({
      data: {
        name: "users",
        comment: "",
        columns: [
          { id: "c1", name: "id", referenceable: true },
          { id: "c2", name: "email", referenceable: false },
        ],
      },
    }),
  },
};
