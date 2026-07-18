import { screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Canvas.stories";

const { Default } = composeStories(stories);

describe("Canvas", () => {
  it("renders the React Flow surface", async () => {
    await Default.run();
    expect(screen.getByTestId("rf__wrapper")).toBeInTheDocument();
  });
});
