import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Dialog.stories";
import { Dialog } from "./Dialog";

const { Open, Large } = composeStories(stories);

describe("Dialog", () => {
  it("shows the title and the content", () => {
    render(<Open />);
    expect(screen.getByRole("dialog", { name: "Dialog Title" })).toBeInTheDocument();
    expect(screen.getByText("Dialog content goes here.")).toBeInTheDocument();
  });

  it("uses the default width by default", () => {
    render(<Open />);
    expect(screen.getByRole("dialog", { name: "Dialog Title" })).toHaveClass("w-96");
  });

  it("uses a wider box for the large size", () => {
    render(<Large />);
    expect(screen.getByRole("dialog", { name: "Dialog Title" })).toHaveClass("w-[640px]");
  });

  it("moves the initial focus to the content's data-autofocus element", () => {
    render(<Open />);
    expect(screen.getByRole("button", { name: "OK" })).toHaveFocus();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = fn();
    render(<Open onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
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
