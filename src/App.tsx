import { BrowserRouter, Link } from "react-router";
import { AppRoutes } from "@/AppRoutes";

function App() {
  return (
    <BrowserRouter>
      <div className="mx-auto flex min-h-svh w-[1126px] max-w-full flex-col border-x border-edge text-center">
        <nav className="border-b border-edge py-3 text-[16px]">
          <Link className="text-accent hover:underline" to="/">
            Home
          </Link>{" "}
          |{" "}
          <Link className="text-accent hover:underline" to="/about">
            About
          </Link>
        </nav>
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}

export default App;
