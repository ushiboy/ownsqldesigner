import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { ExportMermaidDialog } from "./ExportMermaidDialog";

const SAMPLE_CODE =
  'erDiagram\n  users {\n    INTEGER id PK\n    TEXT email\n  }\n  posts {\n    INTEGER user_id FK\n  }\n  users ||--o{ posts : "user_id"';

const meta = {
  title: "pages/MainScreen/ExportMermaidDialog",
  component: ExportMermaidDialog,
  args: {
    schemaName: "Blog Schema",
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <LocaleProvider>
        <Story />
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof ExportMermaidDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    code: SAMPLE_CODE,
  },
};

export const Empty: Story = {
  args: {
    open: true,
    code: "",
  },
};
