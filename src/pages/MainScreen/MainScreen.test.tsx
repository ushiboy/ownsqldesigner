import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./MainScreen.stories";

const { Default } = composeStories(stories);

describe("MainScreen", () => {
  it("hides the side panel when the toggle is clicked and shows it again on a second click", async () => {
    await Default.run();
    const user = userEvent.setup();
    const toggle = screen.getByRole("button", { name: "Toggle side panel" });

    await user.click(toggle);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });
});
