import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Home.stories";

const { Default } = composeStories(stories);

describe("Home", () => {
  it("renders the heading", async () => {
    await Default.run();
    expect(screen.getByRole("heading", { name: "Get started" })).toBeInTheDocument();
  });

  it("increments the counter on click", async () => {
    const user = userEvent.setup();
    await Default.run();

    const button = screen.getByRole("button", { name: "Count is 0" });
    await user.click(button);

    expect(button).toHaveTextContent("Count is 1");
  });
});
