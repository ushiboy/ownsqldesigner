import { Canvas } from "./components/Canvas";
import { NotificationBar } from "./components/NotificationBar";
import { SidePanel } from "./components/SidePanel";
import { Toolbar } from "./components/Toolbar";

type MainScreenViewProps = {
  notificationMessage: string | null;
  isSidePanelOpen: boolean;
  onToggleSidePanel: () => void;
};

export function MainScreenView({
  notificationMessage,
  isSidePanelOpen,
  onToggleSidePanel,
}: MainScreenViewProps) {
  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <Toolbar isSidePanelOpen={isSidePanelOpen} onToggleSidePanel={onToggleSidePanel} />
      <div className="flex min-h-0 flex-1">
        <main aria-label="Canvas" className="relative min-w-0 flex-1">
          <NotificationBar message={notificationMessage} />
          <Canvas />
        </main>
        <SidePanel isOpen={isSidePanelOpen} />
      </div>
    </div>
  );
}
