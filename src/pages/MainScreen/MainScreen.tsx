import { useState } from "react";
import { format } from "date-fns";
import type { SchemaRepository } from "../../domain/schemaRepository";
import { createLocalStorageSchemaRepository } from "../../infrastructure/localStorageSchemaRepository";
import { ActiveDialogProvider } from "./ActiveDialogContext";
import { MainScreenView } from "./MainScreenView";
import { NotificationProvider } from "./NotificationContext";
import { useSchemaWorkspace } from "./useSchemaWorkspace";

const defaultRepository = createLocalStorageSchemaRepository();

type MainScreenProps = {
  /** Injection point for tests and stories; the app uses localStorage. */
  repository?: SchemaRepository;
};

function MainScreen({ repository = defaultRepository }: MainScreenProps) {
  return (
    <NotificationProvider>
      <ActiveDialogProvider>
        <MainScreenContent repository={repository} />
      </ActiveDialogProvider>
    </NotificationProvider>
  );
}

export default MainScreen;

type MainScreenContentProps = {
  repository: SchemaRepository;
};

// Rendered inside the providers so useSchemaWorkspace can reach the
// notification context.
function MainScreenContent({ repository }: MainScreenContentProps) {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const {
    currentSchema,
    savedSchemas,
    createSchema,
    selectSchema,
    renameSchema,
    deleteCurrentSchema,
  } = useSchemaWorkspace(repository);

  return (
    <MainScreenView
      schemaName={currentSchema?.name ?? "—"}
      savedSchemas={savedSchemas}
      currentSchemaId={currentSchema?.id ?? null}
      tableCount={currentSchema?.tables.length ?? 0}
      createdDate={currentSchema === null ? "—" : format(currentSchema.createdAt, "yyyy-MM-dd")}
      isSidePanelOpen={isSidePanelOpen}
      onToggleSidePanel={() => setIsSidePanelOpen((prev) => !prev)}
      onSelectSchema={selectSchema}
      onCreateSchema={createSchema}
      onRenameSchema={renameSchema}
      onDeleteSchema={deleteCurrentSchema}
    />
  );
}
