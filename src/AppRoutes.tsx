import { Route, Routes } from "react-router";
import MainScreen from "@/pages/MainScreen";
import NotFound from "@/pages/NotFound";
import Settings from "@/pages/Settings";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainScreen />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
