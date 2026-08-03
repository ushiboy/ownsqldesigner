import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./RadioOption.stories";

const { Unchecked, Checked } = composeStories(stories);

describe("RadioOption", () => {
  it("renders the label and description", () => {
    render(<Unchecked />);

    expect(
      screen.getByRole("radio", { name: "Table + referenced column name" }),
    ).toBeInTheDocument();
    expect(screen.getByText("e.g. users_id")).toBeInTheDocument();
  });

  it("reflects the checked state", () => {
    render(<Unchecked />);
    expect(screen.getByRole("radio")).not.toBeChecked();
  });

  it("reflects the checked state when true", () => {
    render(<Checked />);
    expect(screen.getByRole("radio")).toBeChecked();
  });

  it("calls onChange when selected", async () => {
    const user = userEvent.setup();
    const onChange = fn();
    render(<Unchecked onChange={onChange} />);

    await user.click(screen.getByRole("radio"));

    expect(onChange).toHaveBeenCalledOnce();
  });
});
