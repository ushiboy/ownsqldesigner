import { type ReactNode, createContext, useContext, useMemo, useState } from "react";

export type DialogKind =
  | "createSchema"
  | "renameSchema"
  | "deleteSchema"
  | "createTable"
  | "addColumn"
  | "editColumn"
  | "deleteColumn"
  | "addKey"
  | "editKey"
  | "deleteKey";

type ActiveDialogContextValue = {
  /** null while no dialog is open; overlapping dialogs are unrepresentable. */
  activeDialog: DialogKind | null;
  openDialog: (dialog: DialogKind) => void;
  closeDialog: () => void;
};

const ActiveDialogContext = createContext<ActiveDialogContextValue | null>(null);

type ActiveDialogProviderProps = {
  /** Non-null only in stories and tests that start with a dialog open. */
  initialDialog?: DialogKind | null;
  children: ReactNode;
};

export function ActiveDialogProvider({
  initialDialog = null,
  children,
}: ActiveDialogProviderProps) {
  const [activeDialog, setActiveDialog] = useState<DialogKind | null>(initialDialog);
  const value = useMemo(
    () => ({
      activeDialog,
      openDialog: (dialog: DialogKind) => setActiveDialog(dialog),
      closeDialog: () => setActiveDialog(null),
    }),
    [activeDialog],
  );
  return <ActiveDialogContext value={value}>{children}</ActiveDialogContext>;
}

export function useActiveDialog(): ActiveDialogContextValue {
  const value = useContext(ActiveDialogContext);
  if (value === null) {
    throw new Error("useActiveDialog must be used within an ActiveDialogProvider");
  }
  return value;
}
