import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppRoutes } from "@/AppRoutes";

describe("AppRoutes", () => {
  it("renders the Home page at /", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Get started" })).toBeInTheDocument();
  });

  it("renders the About page at /about", () => {
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
  });

  it("renders the NotFound page at an unknown path", () => {
    render(
      <MemoryRouter initialEntries={["/unknown"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "404 Not Found" })).toBeInTheDocument();
  });
});
