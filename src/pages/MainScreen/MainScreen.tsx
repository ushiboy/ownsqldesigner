import { useState } from "react";
import { format } from "date-fns";
import type { SchemaRepository } from "../../domain/schemaRepository";
import { createLocalStorageSchemaRepository } from "../../infrastructure/localStorageSchemaRepository";
import { MainScreenView } from "./MainScreenView";
import { useSchemaWorkspace } from "./useSchemaWorkspace";

const defaultRepository = createLocalStorageSchemaRepository();

type MainScreenProps = {
  /** Injection point for tests and stories; the app uses localStorage. */
  repository?: SchemaRepository;
};

function MainScreen({ repository = defaultRepository }: MainScreenProps) {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [isSchemaNameDialogOpen, setIsSchemaNameDialogOpen] = useState(false);
  const { currentSchema, savedSchemas, createSchema } = useSchemaWorkspace(repository);

  return (
    <MainScreenView
      schemaName={currentSchema?.name ?? "—"}
      savedSchemas={savedSchemas}
      tableCount={currentSchema?.tables.length ?? 0}
      createdDate={currentSchema === null ? "—" : format(currentSchema.createdAt, "yyyy-MM-dd")}
      notificationMessage={null}
      isSidePanelOpen={isSidePanelOpen}
      isSchemaNameDialogOpen={isSchemaNameDialogOpen}
      onToggleSidePanel={() => setIsSidePanelOpen((prev) => !prev)}
      onRequestCreateSchema={() => setIsSchemaNameDialogOpen(true)}
      onSubmitCreateSchema={(name) => {
        createSchema(name);
        setIsSchemaNameDialogOpen(false);
      }}
      onCancelCreateSchema={() => setIsSchemaNameDialogOpen(false)}
    />
  );
}

export default MainScreen;
