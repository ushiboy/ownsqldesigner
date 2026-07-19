import type { SchemaSummary } from "../../domain/schema";
import { Canvas } from "./components/Canvas";
import { NotificationBar } from "./components/NotificationBar";
import { SchemaNameDialog } from "./components/SchemaNameDialog";
import { SidePanel } from "./components/SidePanel";
import { Toolbar } from "./components/Toolbar";

type MainScreenViewProps = {
  schemaName: string;
  savedSchemas: SchemaSummary[];
  tableCount: number;
  createdDate: string;
  notificationMessage: string | null;
  isSidePanelOpen: boolean;
  isSchemaNameDialogOpen: boolean;
  onToggleSidePanel: () => void;
  onRequestCreateSchema: () => void;
  onSubmitCreateSchema: (name: string) => void;
  onCancelCreateSchema: () => void;
};

export function MainScreenView({
  schemaName,
  savedSchemas,
  tableCount,
  createdDate,
  notificationMessage,
  isSidePanelOpen,
  isSchemaNameDialogOpen,
  onToggleSidePanel,
  onRequestCreateSchema,
  onSubmitCreateSchema,
  onCancelCreateSchema,
}: MainScreenViewProps) {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <Toolbar
        schemaName={schemaName}
        savedSchemas={savedSchemas}
        onRequestCreateSchema={onRequestCreateSchema}
        isSidePanelOpen={isSidePanelOpen}
        onToggleSidePanel={onToggleSidePanel}
      />
      <div className="flex min-h-0 flex-1">
        <main aria-label="Canvas" className="relative min-w-0 flex-1">
          <NotificationBar message={notificationMessage} />
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
        open={isSchemaNameDialogOpen}
        onSubmit={onSubmitCreateSchema}
        onCancel={onCancelCreateSchema}
      />
    </div>
  );
}
