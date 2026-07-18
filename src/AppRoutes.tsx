import { Route, Routes } from "react-router";
import MainScreen from "@/pages/MainScreen";
import NotFound from "@/pages/NotFound";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MainScreen />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
