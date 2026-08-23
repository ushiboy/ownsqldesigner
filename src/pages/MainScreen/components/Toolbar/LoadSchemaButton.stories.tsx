import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import type { Schema } from "../../../../domain/schema";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { createFakeSchemaRepository } from "../../../../test/fakeSchemaRepository";
import { NotificationProvider } from "../../NotificationContext";
import { SchemaWorkspaceProvider } from "../../SchemaWorkspaceContext";
import { LoadSchemaButton } from "./LoadSchemaButton";

export const currentSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  dialect: "sqlite",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: new Date("2026-07-01T09:00:00.000Z"),
};

type LoadSchemaButtonWithProvidersProps = {
  /** Extra probes a test wants rendered alongside the button, inside the same provider tree. */
  children?: ReactNode;
};

function LoadSchemaButtonWithProviders({ children }: LoadSchemaButtonWithProvidersProps) {
  const [repository] = useState(() =>
    createFakeSchemaRepository({ schemas: [currentSchema], lastSchemaId: currentSchema.id }),
  );
  return (
    <LocaleProvider>
      <NotificationProvider>
        <SchemaWorkspaceProvider repository={repository} initialSchema={currentSchema}>
          <LoadSchemaButton />
          {children}
        </SchemaWorkspaceProvider>
      </NotificationProvider>
    </LocaleProvider>
  );
}

const meta = {
  title: "pages/MainScreen/components/Toolbar/LoadSchemaButton",
  component: LoadSchemaButtonWithProviders,
} satisfies Meta<typeof LoadSchemaButtonWithProviders>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
