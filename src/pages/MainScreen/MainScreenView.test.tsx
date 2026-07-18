import { screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./MainScreenView.stories";

const { Default, WithNotification } = composeStories(stories);

describe("MainScreenView", () => {
  it("renders the toolbar, canvas, and side panel regions", async () => {
    await Default.run();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Canvas" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });

  it("does not show a notification bar without a notification message", async () => {
    await Default.run();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the notification bar when a notification message is set", async () => {
    await WithNotification.run();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
