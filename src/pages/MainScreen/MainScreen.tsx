import { useState } from "react";
import { MainScreenView } from "./MainScreenView";

function MainScreen() {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  return (
    <MainScreenView
      notificationMessage={null}
      isSidePanelOpen={isSidePanelOpen}
      onToggleSidePanel={() => setIsSidePanelOpen((prev) => !prev)}
    />
  );
}

export default MainScreen;
