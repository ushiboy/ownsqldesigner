import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import type { Schema } from "../../../../domain/schema";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { createFakeSchemaRepository } from "../../../../test/fakeSchemaRepository";
import { NotificationProvider } from "../../NotificationContext";
import { SchemaWorkspaceProvider } from "../../SchemaWorkspaceContext";
import { LoadSchemaHandler } from "./LoadSchemaHandler";

export const currentSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  dialect: "sqlite",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: new Date("2026-07-01T09:00:00.000Z"),
};

type LoadSchemaHandlerWithProvidersProps = {
  /** Extra probes a test wants rendered alongside the handler, inside the same provider tree. */
  children?: ReactNode;
};

function LoadSchemaHandlerWithProviders({ children }: LoadSchemaHandlerWithProvidersProps) {
  const [repository] = useState(() =>
    createFakeSchemaRepository({ schemas: [currentSchema], lastSchemaId: currentSchema.id }),
  );
  return (
    <LocaleProvider>
      <NotificationProvider>
        <SchemaWorkspaceProvider repository={repository} initialSchema={currentSchema}>
          <LoadSchemaHandler ref={null} />
          {children}
        </SchemaWorkspaceProvider>
      </NotificationProvider>
    </LocaleProvider>
  );
}

const meta = {
  title: "pages/MainScreen/components/Toolbar/LoadSchemaHandler",
  component: LoadSchemaHandlerWithProviders,
} satisfies Meta<typeof LoadSchemaHandlerWithProviders>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
