import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Dialog.stories";
import { Dialog } from "./Dialog";

const { Open } = composeStories(stories);

describe("Dialog", () => {
  it("shows the title and the content", async () => {
    await Open.run();
    expect(screen.getByRole("dialog", { name: "Dialog Title" })).toBeInTheDocument();
    expect(screen.getByText("Dialog content goes here.")).toBeInTheDocument();
  });

  it("moves the initial focus to the content's data-autofocus element", async () => {
    await Open.run();
    expect(screen.getByRole("button", { name: "OK" })).toHaveFocus();
  });

  it("calls onClose when Escape is pressed", async () => {
    await Open.run();
    await userEvent.keyboard("{Escape}");
    expect(Open.args.onClose).toHaveBeenCalledOnce();
  });

  it("renders nothing while closed", () => {
    const { container } = render(
      <Dialog open={false} title="Dialog Title" onClose={fn()}>
        <p>Dialog content goes here.</p>
      </Dialog>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
