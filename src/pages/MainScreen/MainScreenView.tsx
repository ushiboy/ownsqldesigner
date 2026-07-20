import type { SchemaSummary } from "../../domain/schema";
import { useActiveDialog } from "./ActiveDialogContext";
import { Canvas } from "./components/Canvas";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { NotificationBar } from "./components/NotificationBar";
import { SchemaNameDialog } from "./components/SchemaNameDialog";
import { SidePanel } from "./components/SidePanel";
import { Toolbar } from "./components/Toolbar";

type MainScreenViewProps = {
  schemaName: string;
  savedSchemas: SchemaSummary[];
  currentSchemaId: string | null;
  tableCount: number;
  createdDate: string;
  isSidePanelOpen: boolean;
  onToggleSidePanel: () => void;
  onSelectSchema: (id: string) => void;
  onCreateSchema: (name: string) => void;
  onRenameSchema: (name: string) => void;
  onDeleteSchema: () => void;
};

export function MainScreenView({
  schemaName,
  savedSchemas,
  currentSchemaId,
  tableCount,
  createdDate,
  isSidePanelOpen,
  onToggleSidePanel,
  onSelectSchema,
  onCreateSchema,
  onRenameSchema,
  onDeleteSchema,
}: MainScreenViewProps) {
  const { activeDialog, closeDialog } = useActiveDialog();

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <Toolbar
        schemaName={schemaName}
        savedSchemas={savedSchemas}
        currentSchemaId={currentSchemaId}
        onSelectSchema={onSelectSchema}
        isSidePanelOpen={isSidePanelOpen}
        onToggleSidePanel={onToggleSidePanel}
      />
      <div className="flex min-h-0 flex-1">
        <main aria-label="Canvas" className="relative min-w-0 flex-1">
          <NotificationBar />
          <Canvas />
        </main>
        <SidePanel
          isOpen={isSidePanelOpen}
          schemaName={schemaName}
          tableCount={tableCount}
          createdDate={createdDate}
        />
      </div>
      <SchemaNameDialog
        open={activeDialog === "createSchema"}
        title="New Schema"
        submitLabel="Create"
        onSubmit={(name) => {
          onCreateSchema(name);
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <SchemaNameDialog
        open={activeDialog === "renameSchema"}
        title="Rename Schema"
        submitLabel="Rename"
        initialName={schemaName}
        onSubmit={(name) => {
          onRenameSchema(name);
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={activeDialog === "deleteSchema"}
        title="Delete Schema"
        message={`Delete "${schemaName}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          onDeleteSchema();
          closeDialog();
        }}
        onCancel={closeDialog}
      />
    </div>
  );
}
